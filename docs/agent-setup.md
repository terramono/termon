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
./scripts/agent-demo.sh          # launch + 45s screen recording
./scripts/agent-demo.sh --no-record   # launch only
```

Setup installs npm deps, runs code generation, builds `wavesrv` and a local `wsh` binary, and creates `.env` from `.env.example`.

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

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `invalid wcloud endpoint` | Create `.env` from `.env.example` or export `WCLOUD_ENDPOINT` |
| `WaveDevViteVarName is not exported` | Pull latest — export lives in `frontend/util/isdev.ts` |
| Electron window not found | Confirm `DISPLAY` and wait for Vite + wavesrv ready (~30s) |
| `zig: command not found` | Re-run `agent-setup.sh` or install Zig manually |
