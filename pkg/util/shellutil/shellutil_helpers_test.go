// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os/exec"
	"strings"
	"testing"
)

func TestGetEnvStrKey(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input string
		want  string
	}{
		{"PATH=/usr/bin", "PATH"},
		{"NOEQUALS", "NOEQUALS"},
		{"KEY=", "KEY"},
	}

	for _, tt := range tests {
		if got := GetEnvStrKey(tt.input); got != tt.want {
			t.Fatalf("GetEnvStrKey(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestUpdateCmdEnv(t *testing.T) {
	t.Parallel()

	cmd := &exec.Cmd{Env: []string{"PATH=/usr/bin", "HOME=/tmp", "KEEP=yes"}}
	UpdateCmdEnv(cmd, map[string]string{
		"PATH":  "/opt/bin",
		"NEW":   "value",
		"HOME":  "",
		"EXTRA": "1",
	})

	envMap := make(map[string]string)
	for _, entry := range cmd.Env {
		key := GetEnvStrKey(entry)
		envMap[key] = entry[len(key)+1:]
	}

	if envMap["PATH"] != "/opt/bin" {
		t.Fatalf("PATH = %q", envMap["PATH"])
	}
	if envMap["NEW"] != "value" {
		t.Fatalf("NEW = %q", envMap["NEW"])
	}
	if _, ok := envMap["HOME"]; ok {
		t.Fatalf("HOME should be removed when set to empty")
	}
	if envMap["KEEP"] != "yes" {
		t.Fatalf("KEEP = %q", envMap["KEEP"])
	}
	if envMap["EXTRA"] != "1" {
		t.Fatalf("EXTRA = %q", envMap["EXTRA"])
	}
}

func TestDefaultTermSize(t *testing.T) {
	t.Parallel()

	size := DefaultTermSize()
	if size.Rows != DefaultTermRows || size.Cols != DefaultTermCols {
		t.Fatalf("DefaultTermSize = %+v", size)
	}
}

func TestGetShellTypeFromShellPath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		path string
		want string
	}{
		{"/bin/bash", ShellType_bash},
		{"/usr/local/bin/zsh", ShellType_zsh},
		{"/opt/homebrew/bin/fish", ShellType_fish},
		{"/usr/bin/pwsh", ShellType_pwsh},
		{"/usr/bin/powershell", ShellType_pwsh},
		{"/bin/sh", ShellType_unknown},
	}

	for _, tt := range tests {
		if got := GetShellTypeFromShellPath(tt.path); got != tt.want {
			t.Fatalf("GetShellTypeFromShellPath(%q) = %q, want %q", tt.path, got, tt.want)
		}
	}
}

func TestFormatOSC(t *testing.T) {
	t.Parallel()

	if got := FormatOSC(7); got != "\x1b]7\x07" {
		t.Fatalf("FormatOSC no parts = %q", got)
	}
	if got := FormatOSC(7, "file:///tmp"); got != "\x1b]7;file:///tmp\x07" {
		t.Fatalf("FormatOSC single part = %q", got)
	}
	if got := FormatOSC(1337, "A", "B"); got != "\x1b]1337;A;B\x07" {
		t.Fatalf("FormatOSC multiple parts = %q", got)
	}
}

func TestGetTerminalResetSeq(t *testing.T) {
	t.Parallel()

	seq := GetTerminalResetSeq()
	if !strings.Contains(seq, "\x1b[0m") {
		t.Fatalf("reset seq missing attribute reset: %q", seq)
	}
	if !strings.Contains(seq, FormatOSC(16162, "R")) {
		t.Fatalf("reset seq missing alternate screen disable")
	}
}

func TestFindGitBashNonWindows(t *testing.T) {
	t.Parallel()

	if FindGitBash(nil, false) != "" {
		t.Fatalf("FindGitBash should return empty on non-windows")
	}
}
