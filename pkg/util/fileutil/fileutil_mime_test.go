// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWinSymlinkDir(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		path string
		mode os.FileMode
		want bool
	}{
		{"symlink to dir", "/tmp/linkdir", os.FileMode(winFlagSoftlink << 12), true},
		{"symlink to file", "/tmp/link/file.txt", os.FileMode(winFlagSoftlink << 12), false},
		{"junction", "/tmp/junction", os.FileMode(winFlagJunction << 12), true},
		{"regular file", "/tmp/file.txt", 0, false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := WinSymlinkDir(tc.path, tc.mode); got != tc.want {
				t.Fatalf("WinSymlinkDir(%q) = %v, want %v", tc.path, got, tc.want)
			}
		})
	}
}

func TestDetectMimeTypeWithDirEnt(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	if err := os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	if got := DetectMimeTypeWithDirEnt(entries[0].Name(), entries[0]); got != "directory" {
		t.Fatalf("DetectMimeTypeWithDirEnt dir = %q", got)
	}

	if got := DetectMimeTypeWithDirEnt("data.json", nil); got != "application/json" {
		t.Fatalf("DetectMimeTypeWithDirEnt json = %q", got)
	}
}

func TestDetectMimeTypeZeroByteFile(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "empty.txt")
	if err := os.WriteFile(path, nil, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat: %v", err)
	}
	if got := DetectMimeType(path, info, false); got != "text/plain" {
		t.Fatalf("DetectMimeType empty file = %q", got)
	}
}

func TestFixPathExpandsTilde(t *testing.T) {
	t.Parallel()

	fixed, err := FixPath("~/Documents")
	if err != nil {
		t.Fatalf("FixPath: %v", err)
	}
	if fixed == "~/Documents" {
		t.Fatalf("FixPath should expand tilde, got %q", fixed)
	}
}

func TestApplyEditsRejectsDuplicateMatches(t *testing.T) {
	t.Parallel()

	content := []byte("foo foo")
	_, err := ApplyEdits(content, []EditSpec{{OldStr: "foo", NewStr: "bar"}})
	if err == nil {
		t.Fatal("expected error for duplicate old_str matches")
	}
}
