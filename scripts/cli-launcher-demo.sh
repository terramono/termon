#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Record a demo of Claude, Cursor Agent, and Codex CLI folder launchers.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DURATION=75
OUT_DIR="${ROOT_DIR}/artifacts/cli-launcher-demo"
LOG_FILE="/tmp/termon-cli-launcher.log"
SESSION_NAME="termon-cli-launcher-demo"
MOCK_BIN_DIR="/tmp/termon-mock-cli"

log() { printf '[cli-launcher-demo] %s\n' "$*"; }

if [[ -z "${DISPLAY:-}" ]]; then
    log "DISPLAY is not set"
    exit 1
fi

mkdir -p "$OUT_DIR" "$MOCK_BIN_DIR"

write_mock_cli() {
    local name="$1"
    local label="$2"
    cat >"$MOCK_BIN_DIR/$name" <<EOF
#!/usr/bin/env bash
printf '\n\033[1;36m%s\033[0m interactive session\n' "$label"
printf 'cwd: %s\n\n' "\$(pwd)"
printf 'Type commands (exit to quit):\n'
while true; do
    printf '\033[1;33m%s>\033[0m ' "$name"
    IFS= read -r line || break
    [[ "\$line" == "exit" || "\$line" == "quit" ]] && break
    [[ -n "\$line" ]] && printf '  %s: %s\n' "$label" "\$line"
done
printf '\n%s session ended.\n' "$label"
EOF
    chmod +x "$MOCK_BIN_DIR/$name"
}

write_mock_cli claude "Claude Code"
write_mock_cli agent "Cursor Agent"
write_mock_cli codex "Codex"

export PATH="$MOCK_BIN_DIR:$PATH"

if [[ ! -f "$ROOT_DIR/dist/frontend/index.html" ]]; then
    log "missing dist/frontend — run scripts/agent-setup.sh first"
    exit 1
fi

if [[ ! -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

export WAVETERM_ENVFILE="$ROOT_DIR/.env"
export WAVETERM_NOCONFIRMQUIT="${WAVETERM_NOCONFIRMQUIT:-1}"
export PATH="$MOCK_BIN_DIR:$PATH"

pkill -f 'electron-vite' 2>/dev/null || true
pkill -f 'electron.*dist/main' 2>/dev/null || true
pkill -f 'electron \.' 2>/dev/null || true
sleep 1
rm -f "$LOG_FILE"

tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$SESSION_NAME" 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$ROOT_DIR" -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" \
    "cd '$ROOT_DIR' && export DISPLAY='${DISPLAY}' PATH='$MOCK_BIN_DIR':\$PATH WAVETERM_ENVFILE='$ROOT_DIR/.env' WAVETERM_NOCONFIRMQUIT=1 && npm run start 2>&1 | tee '$LOG_FILE'" C-m

log "waiting for renderer init..."
READY=0
for _ in $(seq 1 120); do
    if [[ -f "$LOG_FILE" ]] && grep -q "wave-ready init time" "$LOG_FILE"; then
        READY=1
        break
    fi
    sleep 1
done

if [[ "$READY" -eq 0 ]]; then
    tail -30 "$LOG_FILE" || true
    exit 1
fi

WIN_ID=""
for _ in $(seq 1 30); do
    WIN_ID="$(xdotool search --name 'Termon' 2>/dev/null | head -1 || true)"
    if [[ -n "$WIN_ID" ]]; then
        break
    fi
    sleep 1
done

if [[ -z "$WIN_ID" ]]; then
    log "Termon window not found"
    exit 1
fi

log "found window $WIN_ID"
xdotool windowactivate --sync "$WIN_ID"
sleep 4

GEOM="$(xdotool getwindowgeometry --shell "$WIN_ID" 2>/dev/null || true)"
# shellcheck disable=SC1090
eval "$GEOM"
W="${WIDTH:-1920}"
H="${HEIGHT:-1080}"
X="${X:-0}"
Y="${Y:-0}"
W=$((W - W % 2))
H=$((H - H % 2))

VIDEO_PATH="$OUT_DIR/cli-launcher-demo.mp4"
log "recording ${DURATION}s to $VIDEO_PATH"

ffmpeg -y -f x11grab -video_size "${W}x${H}" -i "${DISPLAY}+${X},${Y}" \
    -t "$DURATION" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p \
    "$VIDEO_PATH" >/tmp/termon-cli-ffmpeg.log 2>&1 &
FFMPEG_PID=$!

sleep 2

click_widget() {
    local index="$1"
    local wx=$((X + 24))
    local wy=$((Y + 88 + index * 44))
    xdotool mousemove --sync "$wx" "$wy"
    sleep 0.4
    xdotool click 1
    sleep 1.2
}

open_launcher_for_path() {
    local path="$1"
    xdotool type --delay 15 --clearmodifiers "$path"
    sleep 0.3
    xdotool key --clearmodifiers Return
    sleep 0.5
    xdotool key --clearmodifiers Tab
    sleep 0.2
    xdotool key --clearmodifiers Return
    sleep 2.5
    xdotool type --delay 20 --clearmodifiers 'echo launched from Termon'
    xdotool key --clearmodifiers Return
    sleep 1
    xdotool type --delay 20 --clearmodifiers 'exit'
    xdotool key --clearmodifiers Return
    sleep 1.5
}

xdotool windowactivate --sync "$WIN_ID"
sleep 1

DEMO_PATH="$ROOT_DIR"

log "demo: Claude launcher"
click_widget 0
open_launcher_for_path "$DEMO_PATH"

log "demo: Cursor Agent launcher"
click_widget 1
open_launcher_for_path "$DEMO_PATH"

log "demo: Codex launcher"
click_widget 2
open_launcher_for_path "$DEMO_PATH"

sleep 3

wait "$FFMPEG_PID" || true

if [[ -f "$VIDEO_PATH" ]]; then
    log "saved $VIDEO_PATH ($(du -h "$VIDEO_PATH" | cut -f1))"
else
    log "recording failed"
    cat /tmp/termon-cli-ffmpeg.log || true
    exit 1
fi

tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$SESSION_NAME" 2>/dev/null || true
