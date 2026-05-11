## Learned User Preferences

- User prefers brief, direct communication — ask for TLDRs after long agent sessions and dislikes being kept in the dark during extended work.
- User wants to be kept informed at regular intervals; spiraling silently on a problem for 45+ minutes without updates is frustrating.
- User prefers the agent to escalate and summarize when stuck, rather than continuing to loop on a dead-end approach.
- User sometimes drives large autonomous refactor batches (many commits) and expects agents to keep the app green with tests and builds while executing them.

## Learned Workspace Facts

- This fork is branded Termon in the UI and packaging (`emain/emain-platform.ts`, `package.json` productName). It remains a personal, opinionated non-commercial fork of Wave Terminal; keep clear attribution/linking to upstream and avoid implying open contribution expectations.
- Same core stack as upstream Wave: Electron 41, Go in `pkg/` and `cmd/`, React/TypeScript in `frontend/`, Electron main in `emain/`.
- Frontend state management uses Jotai; Go↔frontend RPC uses the `wshrpc` system via preload scripts.
- TypeScript bindings for Go services are auto-generated via `task generate` (runs two Go programs); generated output lands in `frontend/app/store/services.ts` and `frontend/types/gotypes.d.ts` (global types via `declare global`).
- SSH config parsing uses a wavetermdev fork of `kevinburke/ssh_config` (`pkg/remote/sshclient.go`; `WaveSshConfigUserSettings()`).
- Dev workflow: `task init` to initialize, `task electron:quickdev` for the dev server. Runtime state lives under `~/.termon` (packaged) or `~/.termon-dev` (unpackaged dev), a single dotfolder layout that does not share paths with a parallel Waveterm install; legacy `WAVETERM_HOME`, `WAVETERM_CONFIG_HOME`, and `WAVETERM_DATA_HOME` still override paths when set (`emain/emain-platform.ts`).
- `task` may not be in PATH during shell sessions — invoke the underlying Go programs directly when needed.
- When `Electron --version` reports a low version like `v24.x.x`, that is the bundled Node.js internal version, not the Electron version; actual Electron version is in the app plist and `package.json` (v41.1.0 alongside dependencies).
- User's machine: macOS arm64 (Apple Silicon); `package.json` version is 0.14.4 for this fork line.
- SSH panel feature lives in this fork: `GetSshHosts()` in `pkg/service/clientservice/clientservice.go`, components under `frontend/app/sshpanel/`, panel mode atom in `workspace-layout-model.ts`, tab toggle in `tabbar.tsx`.
