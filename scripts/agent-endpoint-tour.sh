#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Record a clean walkthrough: HTTP endpoints via curl + Termon UI + coverage proof.
# Requires: agent-setup.sh, DISPLAY, ffmpeg, xdotool, docker (for SSH panel).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DURATION="${DURATION:-120}"
OUT_DIR="${ROOT_DIR}/artifacts/agent-endpoint-tour"
LOG_FILE="/tmp/termon-endpoint-tour.log"
SESSION_NAME="termon-endpoint-tour"
WAVE_LOG="${HOME}/.termon-dev/waveapp.log"

log() { printf '[endpoint-tour] %s\n' "$*"; }

if [[ -z "${DISPLAY:-}" ]]; then
    log "DISPLAY is not set"
    exit 1
fi

mkdir -p "$OUT_DIR"
[[ -f "$ROOT_DIR/.env" ]] || cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
set -a && source "$ROOT_DIR/.env" && set +a
export WAVETERM_ENVFILE="$ROOT_DIR/.env" WAVETERM_NOCONFIRMQUIT=1

# Optional SSH test VM
if command -v docker >/dev/null 2>&1; then
  "$ROOT_DIR/scripts/ssh-test-vm.sh" || log "ssh-test-vm skipped (docker issue)"
fi

pkill -f 'electron-vite|electron \.' 2>/dev/null || true
sleep 1
rm -f "$LOG_FILE"

tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$SESSION_NAME" 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$ROOT_DIR" -- bash -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" \
  "cd '$ROOT_DIR' && export DISPLAY='$DISPLAY' WAVETERM_ENVFILE='$ROOT_DIR/.env' WAVETERM_NOCONFIRMQUIT=1 WCLOUD_ENDPOINT='$WCLOUD_ENDPOINT' WCLOUD_PING_ENDPOINT='$WCLOUD_PING_ENDPOINT' WCLOUD_WS_ENDPOINT='$WCLOUD_WS_ENDPOINT' && npm run start 2>&1 | tee '$LOG_FILE'" C-m

log "waiting for wave-ready..."
for _ in $(seq 1 120); do
  grep -q "wave-ready init time" "$LOG_FILE" 2>/dev/null && break
  sleep 1
done

WIN_ID=""
for _ in $(seq 1 30); do
  WIN_ID="$(xdotool search --name 'Termon' 2>/dev/null | head -1 || true)"
  [[ -n "$WIN_ID" ]] && break
  sleep 1
done
[[ -n "$WIN_ID" ]] || { log "Termon window not found"; exit 1; }

xdotool windowactivate --sync "$WIN_ID"
SCREEN_W="$(xdotool getdisplaygeometry | awk '{print $1}')"
SCREEN_H="$(xdotool getdisplaygeometry | awk '{print $2}')"
WIN_W=1280
WIN_H=800
WIN_X=$(( (SCREEN_W - WIN_W) / 2 ))
WIN_Y=$(( (SCREEN_H - WIN_H) / 2 ))
xdotool windowsize --sync "$WIN_ID" "$WIN_W" "$WIN_H"
xdotool windowmove --sync "$WIN_ID" "$WIN_X" "$WIN_Y"
sleep 5
# Click center of window to focus the terminal block before typing
xdotool mousemove --window "$WIN_ID" $((WIN_W / 2)) $((WIN_H / 2)) click 1
sleep 2

VIDEO_PATH="$OUT_DIR/endpoint-tour.mp4"
GEOM="$(xdotool getwindowgeometry --shell "$WIN_ID")"
eval "$GEOM"
W=$((WIDTH - WIDTH % 2))
H=$((HEIGHT - HEIGHT % 2))

log "recording ${DURATION}s -> $VIDEO_PATH"
ffmpeg -y -f x11grab -video_size "${W}x${H}" -i "${DISPLAY}+${X},${Y}" \
  -t "$DURATION" -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p \
  "$VIDEO_PATH" >/tmp/endpoint-tour-ffmpeg.log 2>&1 &
FFMPEG_PID=$!
sleep 2

# Discover wavesrv HTTP port from log
HTTP_PORT="$(grep -oP 'Server \[web\] listening on 127.0.0.1:\K[0-9]+' "$WAVE_LOG" 2>/dev/null | tail -1 || true)"
BASE="http://127.0.0.1:${HTTP_PORT:-0}"

run_curl_demo() {
  local label="$1"
  local cmd="$2"
  xdotool windowactivate --sync "$WIN_ID"
  xdotool mousemove --window "$WIN_ID" $((WIN_W / 2)) $((WIN_H / 2)) click 1
  sleep 0.5
  xdotool type --delay 15 "# ${label}"
  xdotool key Return
  sleep 1
  xdotool type --delay 12 "$cmd"
  xdotool key Return
  sleep 3
}

if [[ "$HTTP_PORT" != "0" && -n "$HTTP_PORT" ]]; then
  run_curl_demo "GET /schema/settings.json" "curl -s -o /dev/null -w '%{http_code} schema' ${BASE}/schema/settings.json"
  run_curl_demo "POST /wave/service (invalid body)" "curl -s -o /dev/null -w '%{http_code} service' -X POST ${BASE}/wave/service -d 'not-json'"
  run_curl_demo "GET /wave/stream-local-file" "curl -s -o /dev/null -w '%{http_code} stream-local' '${BASE}/wave/stream-local-file?path=${HOME}/.termon-dev/waveapp.log'"
  run_curl_demo "GET /wave/file (missing)" "curl -s -o /dev/null -w '%{http_code} wave-file' '${BASE}/wave/file?zoneid=00000000-0000-0000-0000-000000000001&name=missing'"
else
  log "could not detect wavesrv HTTP port — skipping curl demos"
fi

# SSH panel toggle
xdotool windowactivate --sync "$WIN_ID"
xdotool key --clearmodifiers ctrl+shift+b
sleep 3
xdotool type --delay 20 '# SSH panel — double-click termon-test if docker VM is running'
xdotool key Return
sleep 2

# Coverage proof in a new external terminal region (type in Termon terminal)
xdotool windowactivate --sync "$WIN_ID"
xdotool type --delay 10 "cd ${ROOT_DIR} && npm run coverage:gates 2>&1 | tail -12"
xdotool key Return
sleep 12

wait "$FFMPEG_PID" || true
log "saved $VIDEO_PATH ($(du -h "$VIDEO_PATH" | cut -f1))"

# Save coverage proof as text artifact
npm run coverage:gates > "$OUT_DIR/coverage-gates.txt" 2>&1 || true
log "coverage proof: $OUT_DIR/coverage-gates.txt"
