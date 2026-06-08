// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"io/fs"
	"os"
	"path/filepath"
	"testing"
	"time"
)

type fakeFileInfo struct {
	name string
	size int64
	mode fs.FileMode
	dir  bool
}

func (f fakeFileInfo) Name() string       { return f.name }
func (f fakeFileInfo) Size() int64        { return f.size }
func (f fakeFileInfo) Mode() fs.FileMode  { return f.mode }
func (f fakeFileInfo) ModTime() time.Time { return time.Time{} }
func (f fakeFileInfo) IsDir() bool        { return f.dir }
func (f fakeFileInfo) Sys() any           { return nil }

type fakeDirEntry struct {
	name string
	mode fs.FileMode
	dir  bool
}

func (f fakeDirEntry) Name() string               { return f.name }
func (f fakeDirEntry) IsDir() bool                { return f.dir }
func (f fakeDirEntry) Type() fs.FileMode          { return f.mode }
func (f fakeDirEntry) Info() (fs.FileInfo, error) { return fakeFileInfo{name: f.name, mode: f.mode, dir: f.dir}, nil }

func TestDetectMimeTypeSpecialFiles(t *testing.T) {
	if got := DetectMimeType("pipe", fakeFileInfo{mode: os.ModeNamedPipe}, false); got != "pipe" {
		t.Fatalf("pipe = %q", got)
	}
	charDev := os.ModeDevice | os.ModeCharDevice
	if got := DetectMimeType("char", fakeFileInfo{mode: charDev}, false); got != "character-special" {
		t.Fatalf("char = %q", got)
	}
	if got := DetectMimeType("block", fakeFileInfo{mode: os.ModeDevice}, false); got != "block-special" {
		t.Fatalf("block = %q", got)
	}
	if got := DetectMimeType("dir", fakeFileInfo{dir: true, mode: os.ModeDir}, false); got != "directory" {
		t.Fatalf("dir = %q", got)
	}
	if got := DetectMimeType("linkdir", fakeFileInfo{mode: os.FileMode(winFlagJunction << 12)}, false); got != "directory" {
		t.Fatalf("symlink dir = %q", got)
	}
}

func TestDetectMimeTypeWithDirEntModes(t *testing.T) {
	charDev := os.ModeDevice | os.ModeCharDevice
	if got := DetectMimeTypeWithDirEnt("char", fakeDirEntry{mode: charDev}); got != "character-special" {
		t.Fatalf("char dirent = %q", got)
	}
	if got := DetectMimeTypeWithDirEnt("block", fakeDirEntry{mode: os.ModeDevice}); got != "block-special" {
		t.Fatalf("block dirent = %q", got)
	}
}

func TestDetectMimeTypeExtendedReadFailure(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "binary.bin")
	if err := os.WriteFile(path, []byte{0, 1, 2, 3, 4, 5, 6, 7, 8}, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	got := DetectMimeType(path, nil, true)
	if got == "" {
		t.Fatal("DetectMimeType binary extended expected mime")
	}
}

func TestAtomicWriteFileRemoveTempError(t *testing.T) {
	dir := t.TempDir()
	blocker := filepath.Join(dir, "blocker")
	if err := os.Mkdir(blocker, 0500); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	target := filepath.Join(blocker, "out.txt")
	err := AtomicWriteFile(target, []byte("data"), 0644)
	if err == nil {
		t.Fatal("AtomicWriteFile expected error")
	}
}
