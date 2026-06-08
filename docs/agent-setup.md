# Agent setup (cloud / headless Linux)

Guide for running Termon from a **cloud agent** or CI environment with a virtual X display. This enables agents to build, launch, interact with, and record the Electron app.

## Prerequisites

| Tool | Purpose |
|------|---------|
| Go 1.25+ | Backend (`wavesrv`, `wsh`) |
| Node 22 | Frontend / Electron |
| Zig | Linux CGO static linking |
| [Task](https://taskfile.dev) | Build orchestration |
| `DISPLAY` | X11 display (e.g. `:1` in Cursor cloud VMs) |
| `ffmpeg`, `xdotool` | Optional — screen recording and UI automation |

## Quick start

```bash
./scripts/agent-setup.sh
./scripts/agent-demo.sh               # launch + 45s screen recording
./scripts/agent-demo.sh --no-record   # launch only
```

Setup installs npm deps (with a **react/react-dom version check**), runs code generation, builds `wavesrv` and `wsh`, **prebuilds the frontend** (`npm run build:dev`), seeds cloud-friendly settings, and creates `.env` from `.env.example`.

The demo script launches via `npm run start` (prebuilt assets) and waits for `wave-ready` in logs before recording — avoids the Vite dev-server race and blank renderer window.

## Manual dev server

```bash
cp .env.example .env    # first time only
export DISPLAY=:1
export WAVETERM_ENVFILE="$PWD/.env"
task dev
```

`task dev` sets the same `WCLOUD_*` endpoints as `.env.example`. In dev mode, `wavesrv` **requires** valid `WCLOUD_ENDPOINT` (https) or it exits immediately.

## Agent automation surface

Once a terminal block is open inside Termon:

| Tool | Use |
|------|-----|
| **`wsh`** | Primary programmatic API — create blocks, pipe output to AI, badges, notifications |
| **`xdotool`** | UI actions `wsh` cannot reach (panel toggles, shortcuts) |
| **`ffmpeg`** | Screen capture for demo artifacts |

Example from inside a Termon terminal block:

```bash
wsh run -m -- echo "agent-driven block"
ls | wsh ai - -m "Summarize" -s
wsh badge check --color green
```

See [agent-backlog.md](./agent-backlog.md) for follow-up work items.

## Artifacts

`scripts/agent-demo.sh` writes recordings to `artifacts/agent-demo/termon-agent-demo.mp4` (gitignored via `artifacts/`).

## Cloud VM settings

First run copies `config/agent-settings.json` to `~/.termon-dev/config/settings.json` if missing:

- `window:disablehardwareacceleration` — software rendering in VMs without GPU
- `term:disablewebgl` — xterm DOM renderer when WebGL is blocklisted

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Black window / blank UI** | Usually **react vs react-dom version mismatch** (React error #527). Run `npm install` and confirm versions match, then `npm run build:dev` |
| `initPromise timed out` in logs | Renderer JS crashed or never loaded — check react versions and rebuild frontend |
| `invalid wcloud endpoint` | Create `.env` from `.env.example` or export `WCLOUD_ENDPOINT` |
| `WaveDevViteVarName is not exported` | Pull latest — export lives in `frontend/util/isdev.ts` |
| Electron window not found | Confirm `DISPLAY`; demo waits for `wave-ready init time` in logs |
| `zig: command not found` | Re-run `agent-setup.sh` or install Zig manually |
