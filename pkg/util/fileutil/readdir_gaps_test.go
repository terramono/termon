// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadDirSymlink(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "target.txt")
	if err := os.WriteFile(target, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	link := filepath.Join(dir, "link.txt")
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("symlink not supported: %v", err)
	}
	result, err := ReadDir(dir, 10)
	if err != nil || result.EntryCount < 2 {
		t.Fatalf("ReadDir symlink = %#v, %v", result, err)
	}
}

func TestReadDirRecursiveSymlinkDir(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "inner.txt"), []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	link := filepath.Join(dir, "linkdir")
	if err := os.Symlink(sub, link); err != nil {
		t.Skipf("symlink not supported: %v", err)
	}
	result, err := ReadDirRecursive(dir, 100)
	if err != nil || len(result.Entries) == 0 {
		t.Fatalf("ReadDirRecursive = %#v, %v", result, err)
	}
}
