#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Local SSH test server when Docker is unavailable (cloud agents).
# Starts sshd on port 2222 with password auth for testuser.

set -euo pipefail

SSH_PORT="${SSH_PORT:-2222}"
SSH_USER="${SSH_USER:-testuser}"
SSH_PASS="${SSH_PASS:-testpass}"
SSH_HOST_ALIAS="termon-test"
RUN_DIR="${HOME}/.termon-ssh-test"
PID_FILE="${RUN_DIR}/sshd.pid"
CONFIG="${RUN_DIR}/sshd_config"
KEY_DIR="${RUN_DIR}/keys"

log() { printf '[ssh-test-local] %s\n' "$*"; }

mkdir -p "$RUN_DIR" "$KEY_DIR"

if [[ ! -f "${KEY_DIR}/ssh_host_rsa_key" ]]; then
    ssh-keygen -t rsa -f "${KEY_DIR}/ssh_host_rsa_key" -N "" -q
fi

if ! id "$SSH_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash "$SSH_USER" 2>/dev/null || useradd -m -s /bin/bash "$SSH_USER"
fi
echo "${SSH_USER}:${SSH_PASS}" | sudo chpasswd 2>/dev/null || echo "${SSH_USER}:${SSH_PASS}" | chpasswd

TEST_PUB="${KEY_DIR}/test_user_key.pub"
TEST_PRIV="${KEY_DIR}/test_user_key"
if [[ ! -f "$TEST_PRIV" ]]; then
    ssh-keygen -t ed25519 -f "$TEST_PRIV" -N "" -q
fi
AUTH_KEYS_FILE="/tmp/termon-ssh-test-authorized_keys"
mkdir -p /tmp
cp "${TEST_PRIV}.pub" "$AUTH_KEYS_FILE"
chmod 644 "$AUTH_KEYS_FILE"

cat >"$CONFIG" <<EOF
Port ${SSH_PORT}
ListenAddress 127.0.0.1
HostKey ${KEY_DIR}/ssh_host_rsa_key
UsePAM no
StrictModes no
PasswordAuthentication yes
PubkeyAuthentication yes
PermitRootLogin no
PidFile ${PID_FILE}
AuthorizedKeysFile /tmp/termon-ssh-test-authorized_keys
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

sudo mkdir -p /run/sshd
sudo chmod 755 /run/sshd

if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE")"
    if ! kill -0 "$OLD_PID" 2>/dev/null; then
        rm -f "$PID_FILE"
    fi
fi
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log "sshd already running (pid $(cat "$PID_FILE"))"
else
    sudo /usr/sbin/sshd -f "$CONFIG" -E "${RUN_DIR}/sshd.log"
    sleep 1
    log "started sshd on 127.0.0.1:${SSH_PORT}"
fi

SSH_CONFIG="${HOME}/.ssh/config"
mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"
BLOCK_START="# --- termon-test (managed by scripts/ssh-test-local.sh) ---"
BLOCK_END="# --- end termon-test ---"
if [[ -f "$SSH_CONFIG" ]]; then
    awk -v start="$BLOCK_START" -v end="$BLOCK_END" '
        $0 == start { skip=1; next }
        $0 == end { skip=0; next }
        !skip { print }
    ' "$SSH_CONFIG" > "${SSH_CONFIG}.tmp" || true
    mv "${SSH_CONFIG}.tmp" "$SSH_CONFIG"
fi
{
    echo "$BLOCK_START"
    echo "Host ${SSH_HOST_ALIAS}"
    echo "    HostName 127.0.0.1"
    echo "    Port ${SSH_PORT}"
    echo "    User ${SSH_USER}"
    echo "    IdentityFile ${TEST_PRIV}"
    echo "    StrictHostKeyChecking no"
    echo "    UserKnownHostsFile /dev/null"
    echo "$BLOCK_END"
} >> "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"

log "Host ${SSH_HOST_ALIAS} ready — ssh ${SSH_HOST_ALIAS} (password: ${SSH_PASS})"
