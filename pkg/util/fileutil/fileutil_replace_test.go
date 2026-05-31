// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReplaceInFile(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "edit.txt")
	if err := os.WriteFile(filePath, []byte("hello world"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	err := ReplaceInFile(filePath, []EditSpec{{OldStr: "world", NewStr: "there"}})
	if err != nil {
		t.Fatalf("ReplaceInFile failed: %v", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if string(data) != "hello there" {
		t.Fatalf("unexpected contents: %q", string(data))
	}
}

func TestReplaceInFilePartial(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "partial.txt")
	if err := os.WriteFile(filePath, []byte("aa bb cc"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	results, err := ReplaceInFilePartial(filePath, []EditSpec{
		{OldStr: "aa", NewStr: "xx"},
		{OldStr: "missing", NewStr: "yy"},
		{OldStr: "cc", NewStr: "zz"},
	})
	if err != nil {
		t.Fatalf("ReplaceInFilePartial failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	if !results[0].Applied || results[1].Applied || results[2].Applied {
		t.Fatalf("unexpected partial results: %#v", results)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if string(data) != "xx bb cc" {
		t.Fatalf("unexpected partial contents: %q", string(data))
	}
}

func TestReplaceInFileErrors(t *testing.T) {
	tmpDir := t.TempDir()
	dirPath := filepath.Join(tmpDir, "dir")
	if err := os.Mkdir(dirPath, 0755); err != nil {
		t.Fatalf("Mkdir failed: %v", err)
	}

	err := ReplaceInFile(dirPath, []EditSpec{{OldStr: "a", NewStr: "b"}})
	if err == nil || !strings.Contains(err.Error(), "regular file") {
		t.Fatalf("expected regular file error, got %v", err)
	}
}
