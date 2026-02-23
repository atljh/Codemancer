use std::process::{Child, Command};
use std::sync::Mutex;

use anthropic_auth::{AsyncOAuthClient, OAuthConfig, OAuthMode};
use serde::{Deserialize, Serialize};
use tauri::Manager;

struct PythonProcess(Mutex<Option<Child>>);

impl Drop for PythonProcess {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.lock().unwrap().take() {
            println!("Stopping Python backend (pid: {})...", child.id());
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct OAuthTokens {
    access_token: String,
    refresh_token: String,
}

/// Stores PKCE state + verifier between start and complete
struct OAuthFlowState(Mutex<Option<(String, String)>>);

#[tauri::command]
async fn start_oauth(
    oauth_state: tauri::State<'_, OAuthFlowState>,
) -> Result<String, String> {
    let config = OAuthConfig::default();
    let client = AsyncOAuthClient::new(config).map_err(|e| e.to_string())?;
    let flow = client.start_flow(OAuthMode::Max).map_err(|e| e.to_string())?;

    let url = flow.authorization_url.to_string();
    let state = flow.state.clone();
    let verifier = flow.verifier.clone();
    *oauth_state.0.lock().unwrap() = Some((state, verifier));

    Ok(url)
}

#[tauri::command]
async fn complete_oauth(
    code: String,
    oauth_state: tauri::State<'_, OAuthFlowState>,
) -> Result<OAuthTokens, String> {
    let (state, verifier) = oauth_state
        .0
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "No OAuth flow in progress".to_string())?;

    let config = OAuthConfig::default();
    let client = AsyncOAuthClient::new(config).map_err(|e| e.to_string())?;
    let tokens = client
        .exchange_code(&code, &state, &verifier)
        .await
        .map_err(|e| e.to_string())?;

    Ok(OAuthTokens {
        access_token: tokens.access_token.clone(),
        refresh_token: tokens.refresh_token.clone(),
    })
}

#[tauri::command]
async fn refresh_oauth_token(refresh_token: String) -> Result<OAuthTokens, String> {
    let config = OAuthConfig::default();
    let client = AsyncOAuthClient::new(config).map_err(|e| e.to_string())?;
    let tokens = client
        .refresh_token(&refresh_token)
        .await
        .map_err(|e| e.to_string())?;

    Ok(OAuthTokens {
        access_token: tokens.access_token.clone(),
        refresh_token: tokens.refresh_token.clone(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PythonProcess(Mutex::new(None)))
        .manage(OAuthFlowState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_oauth,
            complete_oauth,
            refresh_oauth_token
        ])
        .setup(|app| {
            // In dev mode, backend is at ../backend relative to src-tauri (cwd)
            let backend_dir = std::env::current_dir()
                .unwrap_or_default()
                .parent()
                .map(|p| p.join("backend"))
                .unwrap_or_default();

            // Fall back to resource dir for production builds
            let backend_dir = if backend_dir.join("main.py").exists() {
                backend_dir
            } else {
                app.path()
                    .resource_dir()
                    .unwrap_or_default()
                    .join("backend")
            };

            println!("Starting Python backend from: {:?}", backend_dir);

            let child = Command::new("uv")
                .args([
                    "run",
                    "python",
                    "-m",
                    "uvicorn",
                    "main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8420",
                    "--reload",
                ])
                .current_dir(&backend_dir)
                .spawn();

            match child {
                Ok(child) => {
                    println!("Python backend started (pid: {})", child.id());
                    let state = app.state::<PythonProcess>();
                    *state.0.lock().unwrap() = Some(child);
                }
                Err(e) => {
                    eprintln!("Failed to start Python backend: {}", e);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
