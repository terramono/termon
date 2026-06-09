// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReplaceInFilePartialErrorPaths(t *testing.T) {
	dir := t.TempDir()
	missing := filepath.Join(dir, "missing.txt")
	if _, err := ReplaceInFilePartial(missing, nil); err == nil {
		t.Fatal("ReplaceInFilePartial missing expected error")
	}

	subdir := filepath.Join(dir, "subdir")
	if err := os.Mkdir(subdir, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if _, err := ReplaceInFilePartial(subdir, nil); err == nil {
		t.Fatal("ReplaceInFilePartial directory expected error")
	}

	bigPath := filepath.Join(dir, "big.txt")
	if err := os.WriteFile(bigPath, make([]byte, MaxEditFileSize+1), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := ReplaceInFilePartial(bigPath, []EditSpec{{OldStr: "x", NewStr: "y"}}); err == nil {
		t.Fatal("ReplaceInFilePartial too large expected error")
	}
}

func TestDetectMimeTypeOpenError(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "blocked")
	if err := os.WriteFile(path, []byte("hello world data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := os.Chmod(path, 0000); err != nil {
		t.Fatalf("Chmod: %v", err)
	}
	defer os.Chmod(path, 0644)
	if got := DetectMimeType(path, nil, true); got != "" {
		t.Fatalf("DetectMimeType unreadable = %q", got)
	}
}

func TestReadDirParentDir(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	result, err := ReadDir(sub, 10)
	if err != nil || result.ParentDir == "" {
		t.Fatalf("ReadDir parent = %#v, %v", result, err)
	}
}
