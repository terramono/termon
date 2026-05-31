// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadDirListsEntries(t *testing.T) {
	tmpDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(tmpDir, "alpha.txt"), []byte("hello"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}
	if err := os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755); err != nil {
		t.Fatalf("Mkdir failed: %v", err)
	}

	result, err := ReadDir(tmpDir, 100)
	if err != nil {
		t.Fatalf("ReadDir failed: %v", err)
	}
	if result.EntryCount != 2 {
		t.Fatalf("expected 2 entries, got %d", result.EntryCount)
	}
	if result.TotalEntries != 2 {
		t.Fatalf("expected total entries 2, got %d", result.TotalEntries)
	}
	if result.Entries[0].Name != "subdir" {
		t.Fatalf("expected directory first, got %q", result.Entries[0].Name)
	}
	if !result.Entries[0].Dir {
		t.Fatalf("expected subdir entry to be a directory")
	}
	if result.Entries[1].Name != "alpha.txt" {
		t.Fatalf("expected alpha.txt second, got %q", result.Entries[1].Name)
	}
	if result.Entries[1].Size != 5 {
		t.Fatalf("expected file size 5, got %d", result.Entries[1].Size)
	}
	if result.ParentDir != filepath.Dir(tmpDir) {
		t.Fatalf("unexpected parent dir: %q", result.ParentDir)
	}
}

func TestReadDirTruncates(t *testing.T) {
	tmpDir := t.TempDir()
	for i := range 5 {
		name := filepath.Join(tmpDir, "file"+string(rune('a'+i))+".txt")
		if err := os.WriteFile(name, []byte("x"), 0644); err != nil {
			t.Fatalf("WriteFile failed: %v", err)
		}
	}

	result, err := ReadDir(tmpDir, 2)
	if err != nil {
		t.Fatalf("ReadDir failed: %v", err)
	}
	if !result.Truncated {
		t.Fatalf("expected truncated result")
	}
	if result.EntryCount != 2 {
		t.Fatalf("expected 2 entries, got %d", result.EntryCount)
	}
	if result.TotalEntries != 5 {
		t.Fatalf("expected total entries 5, got %d", result.TotalEntries)
	}
}

func TestReadDirErrors(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "notdir.txt")
	if err := os.WriteFile(filePath, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	_, err := ReadDir(filePath, 10)
	if err == nil || !strings.Contains(err.Error(), "not a directory") {
		t.Fatalf("expected not-a-directory error, got %v", err)
	}

	_, err = ReadDir(filepath.Join(tmpDir, "missing"), 10)
	if err == nil {
		t.Fatalf("expected stat error for missing path")
	}
}

func TestReadDirRecursive(t *testing.T) {
	tmpDir := t.TempDir()
	subDir := filepath.Join(tmpDir, "nested")
	if err := os.Mkdir(subDir, 0755); err != nil {
		t.Fatalf("Mkdir failed: %v", err)
	}
	if err := os.WriteFile(filepath.Join(subDir, "leaf.txt"), []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "root.txt"), []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	result, err := ReadDirRecursive(tmpDir, 100)
	if err != nil {
		t.Fatalf("ReadDirRecursive failed: %v", err)
	}
	if result.EntryCount < 2 {
		t.Fatalf("expected at least 2 recursive entries, got %d", result.EntryCount)
	}
	names := map[string]bool{}
	for _, entry := range result.Entries {
		names[entry.Name] = true
	}
	if !names["root.txt"] || !names[filepath.Join("nested", "leaf.txt")] {
		t.Fatalf("unexpected recursive entries: %#v", result.Entries)
	}
}

func TestReadDirRecursiveTruncates(t *testing.T) {
	tmpDir := t.TempDir()
	for i := range 4 {
		name := filepath.Join(tmpDir, "f"+string(rune('a'+i))+".txt")
		if err := os.WriteFile(name, []byte("x"), 0644); err != nil {
			t.Fatalf("WriteFile failed: %v", err)
		}
	}

	result, err := ReadDirRecursive(tmpDir, 2)
	if err != nil {
		t.Fatalf("ReadDirRecursive failed: %v", err)
	}
	if !result.Truncated {
		t.Fatalf("expected truncated recursive result")
	}
	if result.EntryCount != 2 {
		t.Fatalf("expected 2 entries, got %d", result.EntryCount)
	}
}
