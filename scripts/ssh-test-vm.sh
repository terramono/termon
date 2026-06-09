#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Start a disposable SSH server for testing Termon's SSH panel locally.
# Replication: documented in docs/ssh-test-vm.md

set -euo pipefail

CONTAINER_NAME="termon-ssh-test"
SSH_PORT="${SSH_PORT:-2222}"
SSH_USER="${SSH_USER:-testuser}"
SSH_PASS="${SSH_PASS:-testpass}"
SSH_HOST_ALIAS="termon-test"

log() { printf '[ssh-test-vm] %s\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
    log "docker not found — falling back to scripts/ssh-test-local.sh"
    exec "$(dirname "$0")/ssh-test-local.sh"
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    log "removing existing container $CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

log "starting SSH container on port ${SSH_PORT} (user=${SSH_USER})"
docker run -d --name "$CONTAINER_NAME" \
    -p "${SSH_PORT}:22" \
    -e "USER_NAME=${SSH_USER}" \
    -e "USER_PASSWORD=${SSH_PASS}" \
    -e "PASSWORD_ACCESS=true" \
    lscr.io/linuxserver/openssh-server:latest >/dev/null

log "waiting for sshd..."
for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pgrep -x sshd >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

SSH_CONFIG="${HOME}/.ssh/config"
SSH_DIR="${HOME}/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

BLOCK_START="# --- termon-test (managed by scripts/ssh-test-vm.sh) ---"
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
    echo "    StrictHostKeyChecking no"
    echo "    UserKnownHostsFile /dev/null"
    echo "$BLOCK_END"
} >> "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"

log "wrote Host ${SSH_HOST_ALIAS} to ${SSH_CONFIG}"
log "test: ssh ${SSH_HOST_ALIAS}  (password: ${SSH_PASS})"
log "stop: docker rm -f ${CONTAINER_NAME}"
