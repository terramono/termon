// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIsExtendedZshHistoryFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	missing := filepath.Join(dir, "missing-history")
	extended, err := IsExtendedZshHistoryFile(missing)
	if err != nil {
		t.Fatalf("missing file: %v", err)
	}
	if extended {
		t.Fatal("missing file should not be extended history")
	}

	plainPath := filepath.Join(dir, "plain-history")
	if err := os.WriteFile(plainPath, []byte("echo hello\n"), 0o644); err != nil {
		t.Fatalf("write plain: %v", err)
	}
	plain, err := IsExtendedZshHistoryFile(plainPath)
	if err != nil {
		t.Fatalf("plain file: %v", err)
	}
	if plain {
		t.Fatal("plain history should not match extended pattern")
	}

	extendedPath := filepath.Join(dir, "extended-history")
	if err := os.WriteFile(extendedPath, []byte(": 1710000000:0;echo hello\n"), 0o644); err != nil {
		t.Fatalf("write extended: %v", err)
	}
	isExtended, err := IsExtendedZshHistoryFile(extendedPath)
	if err != nil {
		t.Fatalf("extended file: %v", err)
	}
	if !isExtended {
		t.Fatal("expected extended zsh history format")
	}
}
