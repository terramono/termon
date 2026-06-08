#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Launch Termon in dev mode and optionally record a short screen demo.
# Requires agent-setup.sh and a working X display (DISPLAY).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RECORD=1
DURATION=45
OUT_DIR="${ROOT_DIR}/artifacts/agent-demo"
LOG_FILE="/tmp/termon-dev.log"
SESSION_NAME="termon-agent-demo"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-record) RECORD=0; shift ;;
        --duration) DURATION="$2"; shift 2 ;;
        --out) OUT_DIR="$2"; shift 2 ;;
        *) echo "unknown arg: $1"; exit 1 ;;
    esac
done

if [[ -z "${DISPLAY:-}" ]]; then
    echo "DISPLAY is not set — cannot launch Electron GUI"
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

mkdir -p "$OUT_DIR"

pkill -f 'electron-vite dev' 2>/dev/null || true
pkill -f 'electron.*dist/main' 2>/dev/null || true
sleep 1
rm -f "$LOG_FILE"

tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$SESSION_NAME" 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$ROOT_DIR" -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" \
    "cd '$ROOT_DIR' && export DISPLAY='${DISPLAY}' WAVETERM_ENVFILE='$ROOT_DIR/.env' WAVETERM_NOCONFIRMQUIT=1 WCLOUD_PING_ENDPOINT='${WCLOUD_PING_ENDPOINT}' WCLOUD_ENDPOINT='${WCLOUD_ENDPOINT}' WCLOUD_WS_ENDPOINT='${WCLOUD_WS_ENDPOINT}' && npm run dev 2>&1 | tee '$LOG_FILE'" C-m

log_wait() { printf '[agent-demo] %s\n' "$*"; }

log_wait "waiting for Termon window (up to 90s)..."
WIN_ID=""
for _ in $(seq 1 90); do
    WIN_ID="$(xdotool search --name 'Termon' 2>/dev/null | head -1 || true)"
    if [[ -n "$WIN_ID" ]]; then
        break
    fi
    if [[ -f "$LOG_FILE" ]] && tail -5 "$LOG_FILE" | grep -q "wavesrv exited, shutting down"; then
        log_wait "wavesrv failed — tail of log:"
        tail -20 "$LOG_FILE"
        exit 1
    fi
    sleep 1
done

if [[ -z "$WIN_ID" ]]; then
    log_wait "Termon window not found"
    tail -30 "$LOG_FILE" || true
    exit 1
fi

log_wait "found window $WIN_ID"
xdotool windowactivate --sync "$WIN_ID"
sleep 2

if [[ "$RECORD" -eq 0 ]]; then
    log_wait "Termon running (no recording). Logs: $LOG_FILE"
    exit 0
fi

need_ffmpeg() {
    command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg required for recording"; exit 1; }
}
need_ffmpeg

GEOM="$(xdotool getwindowgeometry --shell "$WIN_ID" 2>/dev/null || true)"
# shellcheck disable=SC1090
eval "$GEOM"
W="${WIDTH:-1920}"
H="${HEIGHT:-1080}"
X="${X:-0}"
Y="${Y:-0}"
# libx264 requires even dimensions
W=$((W - W % 2))
H=$((H - H % 2))

VIDEO_PATH="$OUT_DIR/termon-agent-demo.mp4"
log_wait "recording ${DURATION}s to $VIDEO_PATH (${W}x${H}@${X},${Y})"

ffmpeg -y -f x11grab -video_size "${W}x${H}" -i "${DISPLAY}+${X},${Y}" \
    -t "$DURATION" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p \
    "$VIDEO_PATH" >/tmp/termon-ffmpeg.log 2>&1 &
FFMPEG_PID=$!

sleep 3

# Demo interactions: type in the focused terminal block, open a second block via wsh if available
xdotool windowactivate --sync "$WIN_ID"
xdotool type --delay 30 'echo "Hello from Termon cloud agent"'
xdotool key Return
sleep 2
xdotool type --delay 20 'ls -la'
xdotool key Return
sleep 2
xdotool type --delay 20 'uname -a && pwd'
xdotool key Return
sleep 3

# Toggle AI/SSH panel (Ctrl+Shift+A on Linux)
xdotool key --clearmodifiers ctrl+shift+a
sleep 4
xdotool key --clearmodifiers ctrl+shift+a
sleep 3

wait "$FFMPEG_PID" || true

if [[ -f "$VIDEO_PATH" ]]; then
    log_wait "saved $VIDEO_PATH ($(du -h "$VIDEO_PATH" | cut -f1))"
else
    log_wait "recording failed — see /tmp/termon-ffmpeg.log"
    exit 1
fi
