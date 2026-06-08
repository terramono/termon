// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectMimeTypeExtendedPaths(t *testing.T) {
	dir := t.TempDir()

	empty := filepath.Join(dir, "empty.txt")
	if err := os.WriteFile(empty, nil, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(empty, nil, false); got != "text/plain" {
		t.Fatalf("DetectMimeType empty = %q", got)
	}
	if got := DetectMimeType("/missing/file", nil, false); got != "" {
		t.Fatalf("DetectMimeType missing = %q", got)
	}

	jsonFile := filepath.Join(dir, "data.json")
	if err := os.WriteFile(jsonFile, []byte(`{"a":1}`), 0644); err != nil {
		t.Fatalf("WriteFile json: %v", err)
	}
	if got := DetectMimeType(jsonFile, nil, true); got == "" {
		t.Fatal("DetectMimeType json extended expected mime")
	}
}

func TestAtomicWriteFileWriteError(t *testing.T) {
	if err := AtomicWriteFile(filepath.Join(t.TempDir(), "missing", "file.txt"), []byte("x"), 0644); err == nil {
		t.Fatal("AtomicWriteFile missing parent expected error")
	}
}

func TestReadDirRecursiveCoverage(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "a.txt"), []byte("a"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	entries, err := ReadDirRecursive(dir, 100)
	if err != nil || len(entries.Entries) == 0 {
		t.Fatalf("ReadDirRecursive = %#v, %v", entries, err)
	}
}

func TestReplaceInFileCoverage(t *testing.T) {
	dir := t.TempDir()
	fileName := filepath.Join(dir, "sample.txt")
	if err := os.WriteFile(fileName, []byte("hello world"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := ReplaceInFile(fileName, []EditSpec{{OldStr: "world", NewStr: "there"}}); err != nil {
		t.Fatalf("ReplaceInFile: %v", err)
	}
	if _, err := ReplaceInFilePartial(fileName, []EditSpec{{OldStr: "there", NewStr: "go"}}); err != nil {
		t.Fatalf("ReplaceInFilePartial: %v", err)
	}
}
