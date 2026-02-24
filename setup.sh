#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════
#  CODEMANCER — One-Command Setup
#  Usage:  ./setup.sh          (install + dev)
#          ./setup.sh --install (install only)
# ═══════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${CYAN}${BOLD}>> $1${NC}"; }
ok()   { echo -e "${GREEN}   OK${NC} $1"; }
fail() { echo -e "${RED}   FAIL${NC} $1"; exit 1; }

echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   CODEMANCER — SYSTEM INITIALIZATION  ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ──────────────────────────

step "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js not found. Install: https://nodejs.org"
NODE_V=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_V" -ge 18 ] || fail "Node.js >= 18 required (found v$NODE_V)"
ok "Node.js $(node -v)"

command -v pnpm >/dev/null 2>&1 || {
  step "Installing pnpm..."
  npm install -g pnpm
}
ok "pnpm $(pnpm -v)"

command -v python3 >/dev/null 2>&1 || fail "Python 3 not found. Install Python >= 3.12"
PY_V=$(python3 -c 'import sys; print(sys.version_info.minor)')
[ "$PY_V" -ge 12 ] || fail "Python >= 3.12 required (found 3.$PY_V)"
ok "Python $(python3 --version | cut -d' ' -f2)"

command -v uv >/dev/null 2>&1 || {
  step "Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
}
ok "uv $(uv --version | cut -d' ' -f2)"

if command -v rustc >/dev/null 2>&1; then
  ok "Rust $(rustc --version | cut -d' ' -f2)"
else
  echo -e "${DIM}   Rust not found — needed only for 'pnpm tauri dev' (desktop app)${NC}"
  echo -e "${DIM}   Install: https://rustup.rs${NC}"
fi

# ── Install dependencies ─────────────────────────

step "Installing frontend dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
ok "Frontend packages installed"

step "Installing backend dependencies..."
cd backend && uv sync && cd ..
ok "Backend packages installed"

# ── Create docs directory if missing ─────────────

mkdir -p docs

# ── Done ─────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}  ╔════════════════════════════════════════╗"
echo "  ║   INITIALIZATION COMPLETE              ║"
echo -e "  ╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Quick start:${NC}"
echo -e "    ${CYAN}pnpm tauri dev${NC}      Full desktop app (Tauri + Vite + Python)"
echo -e "    ${CYAN}pnpm dev${NC}            Frontend only (http://localhost:1420)"
echo ""
echo -e "  ${BOLD}Backend only:${NC}"
echo -e "    ${CYAN}cd backend && uv run python -m uvicorn main:app --host 127.0.0.1 --port 8420${NC}"
echo ""

# Auto-launch dev if --install was NOT passed
if [[ "${1:-}" != "--install" ]]; then
  step "Launching development server..."
  pnpm tauri dev
fi
