# Agent backlog

Issues for future agent sessions. Populated from security scan and coverage follow-ups.

## Security

- **npm audit (high/critical):** 12 high, 0 critical in 48 total findings. Notable highs: `@babel/plugin-transform-modules-systemjs`, `@xmldom/xmldom`, `fast-uri`, `lodash`, `minimatch`, `node-forge`, `path-to-regexp`, `serialize-javascript`, `svgo`, `tar-fs`, `tmp`, `@ai-sdk/provider-utils` chain. Many fixable via `npm audit fix`; some need breaking upgrades (ai, monaco-editor, docusaurus).
- **go vet:** Clean on `./pkg/...` and `./cmd/...`.
- **govulncheck:** 21 vulnerabilities affecting application code (mainly `golang.org/x/crypto@v0.50.0` SSH stack, `golang.org/x/net@v0.52.0`, `crypto/tls@go1.25.6`). Upgrade paths: `x/crypto@v0.52.0`, `x/net@v0.55.0`, Go 1.25.7+.
- **Secrets grep:** No hardcoded private keys or common token patterns in tracked source; matches are test fixtures and UI copy only.
- **CodeQL:** `.github/workflows/codeql.yml` exists (manual `workflow_dispatch`, JS + Go matrix); not part of default PR CI.

## Test coverage

- **frontend/layout/lib (35.7%, target 70%):** `layoutModel.ts` and `TileLayout.tsx` dominate uncovered lines; pure-function tests in `layoutTree`/`layoutNode` are near saturation.
- **pkg/util (58.4%, target 65%):** `fileutil`/`shellutil` still below gate average; continue table-driven tests for ReadDir edge cases and shell quoting.
- **frontend/app/sshpanel (98.2%):** Gate healthy; optional polish only.
- **frontend/util (85.0%):** `ijson.ts` and `wsutil.ts` remain partial if further ratchet is desired.

## Other

- Install `govulncheck` on dev/CI PATH (`go install golang.org/x/vuln/cmd/govulncheck@latest`) for repeatable scans.
- Untracked test files in working tree (`connparse_s3_test.go`, `wavebase_validate_test.go`, `settingsconfig_helpers_test.go`) could be committed in a future coverage batch.
