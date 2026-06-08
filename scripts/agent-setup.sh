#!/usr/bin/env bash
# Copyright 2026, Command Line Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Bootstrap Termon for cloud agents and headless Linux dev environments.
# Installs toolchain deps, npm modules, builds the Go backend, and writes .env.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf '[agent-setup] %s\n' "$*"; }

need_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "missing required command: $1"
        exit 1
    fi
}

install_task() {
    if command -v task >/dev/null 2>&1; then
        return
    fi
    log "installing task..."
    local arch url
    arch="$(uname -m)"
    case "$arch" in
        x86_64) url="https://github.com/go-task/task/releases/download/v3.42.1/task_linux_amd64.tar.gz" ;;
        aarch64|arm64) url="https://github.com/go-task/task/releases/download/v3.42.1/task_linux_arm64.tar.gz" ;;
        *) log "unsupported arch for task install: $arch"; exit 1 ;;
    esac
    curl -sL "$url" | tar xz -C /tmp
    sudo mv /tmp/task /usr/local/bin/task
}

install_zig() {
    if command -v zig >/dev/null 2>&1; then
        return
    fi
    log "installing zig (required for Linux CGO builds)..."
    local arch ver=0.14.0
    arch="$(uname -m)"
    case "$arch" in
        x86_64) arch="x86_64" ;;
        aarch64|arm64) arch="aarch64" ;;
        *) log "unsupported arch for zig install: $arch"; exit 1 ;;
    esac
    curl -sL "https://ziglang.org/download/${ver}/zig-linux-${arch}-${ver}.tar.xz" | tar xJ -C /tmp
    sudo rm -rf /opt/zig
    sudo mv "/tmp/zig-linux-${arch}-${ver}" /opt/zig
    sudo ln -sf /opt/zig/zig /usr/local/bin/zig
}

write_env_file() {
    if [[ -f "$ROOT_DIR/.env" ]]; then
        log ".env already exists, skipping"
        return
    fi
    if [[ ! -f "$ROOT_DIR/.env.example" ]]; then
        log "missing .env.example"
        exit 1
    fi
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    log "created .env from .env.example"
}

log "Termon agent setup (root: $ROOT_DIR)"

need_cmd go
need_cmd node
need_cmd npm
need_cmd curl

install_task
install_zig

log "npm install..."
npm install --no-audit --no-fund

write_env_file

log "code generation..."
task generate

log "building Linux backend..."
task build:server:linux

log "building local wsh binary..."
VERSION="$(node version.cjs)"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.WaveVersion=${VERSION}" \
    -o "dist/bin/wsh-${VERSION}-linux.x64" \
    cmd/wsh/main-wsh.go

log "setup complete"
log "start dev:  task dev   (or:  scripts/agent-demo.sh --no-record)"
log "DISPLAY=${DISPLAY:-unset}"
