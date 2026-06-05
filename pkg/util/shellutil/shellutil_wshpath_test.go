// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"strings"
	"testing"
)

func TestGetLocalWshBinaryPathSupported(t *testing.T) {
	t.Parallel()

	path, err := GetLocalWshBinaryPath("0.14.4", "darwin", "arm64")
	if err != nil {
		t.Fatalf("GetLocalWshBinaryPath: %v", err)
	}
	if !strings.Contains(path, "wsh-0.14.4-darwin.arm64") {
		t.Fatalf("path = %q", path)
	}

	path, err = GetLocalWshBinaryPath("1.0.0", "windows", "amd64")
	if err != nil {
		t.Fatalf("GetLocalWshBinaryPath windows: %v", err)
	}
	if !strings.HasSuffix(path, ".exe") {
		t.Fatalf("expected .exe suffix, got %q", path)
	}
	if !strings.Contains(path, "wsh-1.0.0-windows.x64.exe") {
		t.Fatalf("path = %q", path)
	}
}

func TestGetLocalWshBinaryPathUnsupported(t *testing.T) {
	t.Parallel()

	_, err := GetLocalWshBinaryPath("0.14.4", "freebsd", "arm64")
	if err == nil {
		t.Fatal("expected error for unsupported platform")
	}
	if !strings.Contains(err.Error(), "unsupported wsh platform") {
		t.Fatalf("err = %v", err)
	}
}

func TestIsExtendedZshHistoryFileEmptyContent(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	emptyPath := dir + "/empty-history"
	if err := os.WriteFile(emptyPath, []byte("\n\n"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	isExtended, err := IsExtendedZshHistoryFile(emptyPath)
	if err != nil {
		t.Fatalf("IsExtendedZshHistoryFile: %v", err)
	}
	if isExtended {
		t.Fatal("empty history file should not be extended")
	}
}
