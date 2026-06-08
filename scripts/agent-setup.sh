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

check_react_versions() {
    local react_ver react_dom_ver
    react_ver="$(node -e "console.log(require('react/package.json').version)")"
    react_dom_ver="$(node -e "console.log(require('react-dom/package.json').version)")"
    if [[ "$react_ver" != "$react_dom_ver" ]]; then
        log "react (${react_ver}) and react-dom (${react_dom_ver}) must match — run npm install"
        exit 1
    fi
    log "react ${react_ver} / react-dom ${react_dom_ver} aligned"
}

seed_cloud_settings() {
    local settings_dir="${HOME}/.termon-dev/config"
    local settings_file="${settings_dir}/settings.json"
    if [[ -f "$settings_file" ]]; then
        return
    fi
    mkdir -p "$settings_dir"
    cp "$ROOT_DIR/config/agent-settings.json" "$settings_file"
    log "seeded cloud VM settings at ${settings_file}"
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
check_react_versions

write_env_file
seed_cloud_settings

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

log "building frontend (required for agent demo — avoids vite dev race)..."
npm run build:dev

log "setup complete"
log "launch:  scripts/agent-demo.sh --no-record"
log "DISPLAY=${DISPLAY:-unset}"
