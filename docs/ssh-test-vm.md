# SSH test VM (for SSH panel demos)

Disposable local SSH server for testing Termon's SSH panel without a real remote host.

## Start

```bash
./scripts/ssh-test-vm.sh
```

Uses Docker when available; otherwise falls back to `scripts/ssh-test-local.sh` (native `sshd` on port 2222).

With Docker:

1. Runs [linuxserver/openssh-server](https://docs.linuxserver.io/images/docker-openssh-server) on **port 2222**
2. Creates user `testuser` / password `testpass`
3. Appends a `Host termon-test` block to `~/.ssh/config`

## Connect from your shell

```bash
ssh termon-test
# password: testpass
```

## Connect from Termon

1. Open the SSH panel (`Ctrl+Shift+B` or tab bar toggle)
2. Double-click **termon-test** (group `termon` or `other` depending on pattern)
3. A new terminal block should open with an SSH session

Or from a Termon terminal block:

```bash
wsh ssh termon-test -n
```

## Teardown

```bash
docker rm -f termon-ssh-test
```

Remove the `termon-test` block from `~/.ssh/config` manually if desired.

## Customization

| Env var | Default |
|---------|---------|
| `SSH_PORT` | 2222 |
| `SSH_USER` | testuser |
| `SSH_PASS` | testpass |
