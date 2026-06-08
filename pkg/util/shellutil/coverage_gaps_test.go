// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func writeFakeShell(t *testing.T, name string, output string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, name)
	content := "#!/bin/sh\necho '" + output + "'\n"
	if err := os.WriteFile(path, []byte(content), 0755); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	return path
}

func TestGetShellVersionFakeShells(t *testing.T) {
	cases := []struct {
		name     string
		output   string
		shellTyp string
		wantErr  bool
	}{
		{"bash", "GNU bash, version 5.2.0", ShellType_bash, false},
		{"zsh", "zsh 5.9", ShellType_zsh, false},
		{"fish", "fish, version 3.6.0", ShellType_fish, false},
		{"pwsh", "PowerShell 7.4.0", ShellType_pwsh, false},
		{"bad", "no version", ShellType_bash, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			path := writeFakeShell(t, tc.name, tc.output)
			version, err := getShellVersion(path, tc.shellTyp)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil || version == "" {
				t.Fatalf("version=%q err=%v", version, err)
			}
		})
	}
}

func TestDetectLocalShellPathDefault(t *testing.T) {
	t.Setenv("SHELL", "")
	got := DetectLocalShellPath()
	if got == "" {
		t.Fatal("DetectLocalShellPath expected default")
	}
}

func TestCopyLocalWshToBin(t *testing.T) {
	dir := t.TempDir()
	binDir := filepath.Join(dir, "bin")
	if err := os.MkdirAll(binDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	wshPath, err := GetLocalWshBinaryPath("0.0.0", runtime.GOOS, runtime.GOARCH)
	if err != nil {
		t.Fatalf("GetLocalWshBinaryPath: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(wshPath), 0755); err != nil {
		t.Fatalf("MkdirAll wsh parent: %v", err)
	}
	if err := os.WriteFile(wshPath, []byte("wsh-binary"), 0755); err != nil {
		t.Fatalf("WriteFile wsh: %v", err)
	}
	t.Cleanup(func() { os.Remove(wshPath) })

	if err := copyLocalWshToBin(binDir); err != nil {
		t.Fatalf("copyLocalWshToBin: %v", err)
	}
	dstName := "wsh"
	if runtime.GOOS == "windows" {
		dstName = "wsh.exe"
	}
	if _, err := os.Stat(filepath.Join(binDir, dstName)); err != nil {
		t.Fatalf("copied wsh missing: %v", err)
	}
}

func TestInitRcFilesBlockedDir(t *testing.T) {
	dir := t.TempDir()
	blocker := filepath.Join(dir, "file-not-dir")
	if err := os.WriteFile(blocker, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := InitRcFiles(blocker, filepath.Join(dir, "bin")); err == nil {
		t.Fatal("InitRcFiles blocked dir expected error")
	}
}
