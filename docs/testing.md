# Testing

Brief reference for running tests and coverage locally. CI runs the same checks on pull requests via [`.github/workflows/unit-tests.yml`](../.github/workflows/unit-tests.yml).

## Frontend

```sh
npm run test:unit          # Vitest, no coverage (230+ tests)
npm run coverage           # Vitest + Istanbul; writes ./coverage/
npm run coverage:gates:frontend
```

Gate thresholds live in [`scripts/coverage-gates.json`](../scripts/coverage-gates.json). The checker reads `coverage/lcov.info` and compares line coverage for scoped directories (currently `frontend/util`, `frontend/layout/lib`).

## Go

From the repo root:

```sh
go test ./pkg/... ./cmd/wsh/...
go test -coverprofile=coverage.out ./pkg/... ./cmd/wsh/...
npm run coverage:gates:go
```

Go gates measure statement coverage for selected packages under `pkg/util/` (see `coverage-gates.json`).

## All gates

```sh
npm run coverage:frontend && npm run coverage:gates:frontend
npm run coverage:gates:go
# or
npm run coverage:gates
```

## CI behavior

On non-draft PRs, the **Unit Tests** workflow runs two jobs:

1. **Frontend** — `npm run test:unit`, `npm run coverage:frontend`, `npm run coverage:gates:frontend`; uploads `coverage/lcov.info` as an artifact.
2. **Go** — `go test ./pkg/... ./cmd/wsh/...`, coverage profile, `node scripts/check-coverage-gates.mjs --go`; uploads `coverage.out`.

Gate failures block the job. Thresholds are ratcheted upward over time (`minPercent` in `coverage-gates.json`); `targetPercent` is the long-term goal, not enforced yet.
