import { useState, useCallback, useRef, useEffect } from "react";
import type { TelegramDialog, TelegramMessage, CommsAuthState } from "../types/game";
import { useGameStore } from "../stores/gameStore";

// GramJS types — loaded dynamically to avoid top-level Buffer crash
type TelegramClientType = import("telegram").TelegramClient;
type StringSessionType = import("telegram/sessions").StringSession;

const SESSION_KEY = "tg_session";

let client: TelegramClientType | null = null;

// Lazy-load GramJS only when needed (after Buffer polyfill is active)
async function loadGramJS() {
  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");
  return { TelegramClient, StringSession };
}

export function useTelegram() {
  const [authState, setAuthState] = useState<CommsAuthState>("disconnected");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const settings = useGameStore((s) => s.settings);
  const setCommsConnected = useGameStore((s) => s.setCommsConnected);
  const setCommsDialogs = useGameStore((s) => s.setCommsDialogs);
  const setCommsMessages = useGameStore((s) => s.setCommsMessages);

  const codeResolveRef = useRef<((v: string) => void) | null>(null);
  const passwordResolveRef = useRef<((v: string) => void) | null>(null);

  const hasCredentials = !!(settings.telegram_api_id && settings.telegram_api_hash);

  const getClient = useCallback(async () => {
    if (client) return client;
    const { TelegramClient, StringSession } = await loadGramJS();
    const sessionStr = localStorage.getItem(SESSION_KEY) || "";
    const session = new StringSession(sessionStr);
    const apiId = parseInt(settings.telegram_api_id, 10);
    const apiHash = settings.telegram_api_hash;
    client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: "Codemancer Desktop",
      systemVersion: "1.0",
      appVersion: "1.0",
      useWSS: true,
    });
    return client;
  }, [settings.telegram_api_id, settings.telegram_api_hash]);

  const saveSession = useCallback(async () => {
    if (client) {
      const sessionStr = (client.session as StringSessionType).save();
      localStorage.setItem(SESSION_KEY, sessionStr);
    }
  }, []);

  const markConnected = useCallback(() => {
    setAuthState("connected");
    setCommsConnected(true);
    saveSession();
  }, [setCommsConnected, saveSession]);

  // Auto-connect if session exists
  useEffect(() => {
    if (!hasCredentials) return;
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;

    let cancelled = false;
    (async () => {
      try {
        const c = await getClient();
        await c.connect();
        if (cancelled) return;
        if (await c.isUserAuthorized()) {
          markConnected();
        }
      } catch {
        // session expired or invalid
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCredentials]);

  const initClient = useCallback(async () => {
    if (!hasCredentials) return;
    const c = await getClient();
    await c.connect();
    if (await c.isUserAuthorized()) {
      markConnected();
    }
  }, [hasCredentials, getClient, markConnected]);

  const startPhoneAuth = useCallback(async (phone: string) => {
    if (!hasCredentials) return;
    const c = await getClient();
    if (!c.connected) await c.connect();

    setAuthState("code_pending");

    try {
      await c.start({
        phoneNumber: () => Promise.resolve(phone),
        phoneCode: () =>
          new Promise<string>((resolve) => {
            codeResolveRef.current = resolve;
          }),
        password: () => {
          setAuthState("password_pending");
          return new Promise<string>((resolve) => {
            passwordResolveRef.current = resolve;
          });
        },
        onError: ((_err: Error) => true) as unknown as (err: Error) => Promise<boolean>,
      });
      markConnected();
    } catch {
      setAuthState("disconnected");
    }
  }, [hasCredentials, getClient, markConnected]);

  const submitPhoneCode = useCallback((code: string) => {
    codeResolveRef.current?.(code);
    codeResolveRef.current = null;
  }, []);

  const submitPassword = useCallback((pw: string) => {
    passwordResolveRef.current?.(pw);
    passwordResolveRef.current = null;
  }, []);

  const startQrAuth = useCallback(async () => {
    if (!hasCredentials) return;
    const c = await getClient();
    if (!c.connected) await c.connect();
    setAuthState("qr_pending");

    try {
      await c.signInUserWithQrCode(
        { apiId: parseInt(settings.telegram_api_id, 10), apiHash: settings.telegram_api_hash },
        {
          qrCode: async (code) => {
            const token = Buffer.from(code.token).toString("base64")
              .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            setQrUrl(`tg://login?token=${token}`);
          },
          password: async () => {
            setAuthState("password_pending");
            return new Promise<string>((resolve) => {
              passwordResolveRef.current = resolve;
            });
          },
          onError: async (err) => {
            console.warn("[COMMS] QR auth error:", err?.message || err);
            // Return true to let GramJS retry with a new QR code
            return true;
          },
        }
      );
      markConnected();
    } catch (err) {
      console.error("[COMMS] QR auth failed:", err);
      // Only reset if we're still in qr_pending (not password flow)
      setAuthState((prev) => prev === "qr_pending" ? "disconnected" : prev);
    }
  }, [hasCredentials, getClient, settings.telegram_api_id, settings.telegram_api_hash, markConnected]);

  const fetchDialogs = useCallback(async () => {
    if (!client || authState !== "connected") return;
    try {
      const dialogs = await client.getDialogs({ limit: 50 });
      const mapped: TelegramDialog[] = dialogs.map((d) => ({
        id: d.id?.toString() ?? "",
        title: d.title ?? "Unknown",
        unreadCount: d.unreadCount ?? 0,
        isUser: d.isUser ?? false,
        isGroup: d.isGroup ?? false,
        isChannel: d.isChannel ?? false,
        lastMessage: (d.message?.message ?? "").slice(0, 100),
        lastMessageDate: d.message?.date ?? 0,
      }));
      setCommsDialogs(mapped);
    } catch {
      // error fetching dialogs
    }
  }, [authState, setCommsDialogs]);

  const fetchMessages = useCallback(async (dialogId: string) => {
    if (!client || authState !== "connected") return;
    try {
      const entity = await client.getEntity(dialogId);
      const msgs = await client.getMessages(entity, { limit: 50 });
      const mapped: TelegramMessage[] = msgs.map((m) => ({
        id: m.id,
        senderId: String(m.senderId ?? ""),
        senderName: (m.sender && "firstName" in m.sender ? String((m.sender as unknown as Record<string, unknown>).firstName ?? "") : ""),
        text: m.message || "",
        date: m.date ?? 0,
        out: m.out ?? false,
      }));
      setCommsMessages(mapped);
    } catch {
      // error fetching messages
    }
  }, [authState, setCommsMessages]);

  const disconnect = useCallback(async () => {
    if (client) {
      try {
        await client.destroy();
      } catch { /* ignore */ }
      client = null;
    }
    localStorage.removeItem(SESSION_KEY);
    setAuthState("disconnected");
    setCommsConnected(false);
    setCommsDialogs([]);
    setCommsMessages([]);
    setQrUrl(null);
  }, [setCommsConnected, setCommsDialogs, setCommsMessages]);

  return {
    authState,
    qrUrl,
    hasCredentials,
    initClient,
    startPhoneAuth,
    submitPhoneCode,
    submitPassword,
    startQrAuth,
    fetchDialogs,
    fetchMessages,
    disconnect,
  };
}
