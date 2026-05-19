// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wavebase

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolvePathInHome(t *testing.T) {
	homeDir := t.TempDir()
	t.Setenv("HOME", homeDir)
	if runtimeHome := os.Getenv("USERPROFILE"); runtimeHome != "" {
		t.Setenv("USERPROFILE", homeDir)
	}

	allowedFile := filepath.Join(homeDir, "allowed.txt")
	if err := os.WriteFile(allowedFile, []byte("ok"), 0o600); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	resolved, err := ResolvePathInHome("~/allowed.txt")
	if err != nil {
		t.Fatalf("ResolvePathInHome: %v", err)
	}
	if resolved != allowedFile {
		t.Fatalf("expected %q, got %q", allowedFile, resolved)
	}

	_, err = ResolvePathInHome("~/../../../etc/passwd")
	if err == nil {
		t.Fatal("expected path traversal to be rejected")
	}
	if !strings.Contains(err.Error(), "outside home") {
		t.Fatalf("unexpected error: %v", err)
	}
}
