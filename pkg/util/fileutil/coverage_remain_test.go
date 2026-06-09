// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"testing"
	"time"
)

func TestParseByteRangeOpenEndInvalid(t *testing.T) {
	if _, err := ParseByteRange("-5-"); err == nil {
		t.Fatal("ParseByteRange negative open-end expected error")
	}
	if _, err := ParseByteRange("bad-"); err == nil {
		t.Fatal("ParseByteRange bad open-end expected error")
	}
}

func TestDetectMimeTypeByExtension(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "page.html")
	if err := os.WriteFile(path, []byte("<html></html>"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(path, nil, false); got == "" {
		t.Fatal("DetectMimeType html extension expected type")
	}
}

func TestDetectMimeTypeExtendedEmptyRead(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "empty")
	if err := os.WriteFile(path, []byte{}, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(path, nil, true); got != "text/plain" {
		t.Fatalf("DetectMimeType empty = %q", got)
	}
}

func TestDetectMimeTypeExtendedOctetStream(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "data")
	if err := os.WriteFile(path, make([]byte, 64), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(path, nil, true); got != "" {
		t.Fatalf("DetectMimeType octet-stream = %q", got)
	}
}

func TestDetectMimeTypeWithDirEntSymlink(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "target")
	if err := os.Mkdir(target, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	link := filepath.Join(dir, "link")
	if err := os.Symlink(target, link); err != nil {
		t.Skip("symlinks not supported")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	var linkEnt os.DirEntry
	for _, e := range entries {
		if e.Name() == "link" {
			linkEnt = e
			break
		}
	}
	got := DetectMimeTypeWithDirEnt(link, linkEnt)
	if got != "" && got != "directory" {
		t.Fatalf("DetectMimeTypeWithDirEnt symlink = %q", got)
	}
}

func TestAtomicWriteFileErrors(t *testing.T) {
	dir := t.TempDir()
	blocker := filepath.Join(dir, "blocker")
	if err := os.WriteFile(blocker, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := AtomicWriteFile(filepath.Join(blocker, "out.txt"), []byte("data"), 0644); err == nil {
		t.Fatal("AtomicWriteFile write error expected")
	}

	readOnlyDir := filepath.Join(dir, "ro")
	if err := os.Mkdir(readOnlyDir, 0500); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	dst := filepath.Join(readOnlyDir, "out.txt")
	if err := AtomicWriteFile(dst, []byte("data"), 0644); err == nil {
		t.Fatal("AtomicWriteFile rename error expected")
	}
}

func TestReplaceInFileWriteErrorRemain(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "ro.txt")
	if err := os.WriteFile(path, []byte("hello"), 0444); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if runtime.GOOS != "windows" {
		if err := ReplaceInFile(path, []EditSpec{{OldStr: "hello", NewStr: "world"}}); err == nil {
			t.Fatal("ReplaceInFile write error expected")
		}
	}
}

func TestReadDirSymlinkStatFallback(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "target")
	if err := os.Mkdir(target, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	badLink := filepath.Join(dir, "badlink")
	if err := os.Symlink(filepath.Join(dir, "missing"), badLink); err != nil {
		t.Skip("symlinks not supported")
	}
	result, err := ReadDir(dir, 10)
	if err != nil || len(result.Entries) == 0 {
		t.Fatalf("ReadDir = %#v, %v", result, err)
	}
}

func TestReadDirManySymlinks(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "target")
	if err := os.Mkdir(target, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	for i := 0; i < 1001; i++ {
		link := filepath.Join(dir, "link"+strconv.Itoa(i))
		if err := os.Symlink(target, link); err != nil {
			t.Skip("symlinks not supported")
		}
	}
	result, err := ReadDir(dir, 2000)
	if err != nil || len(result.Entries) < 1000 {
		t.Fatalf("ReadDir many symlinks entries=%d err=%v", len(result.Entries), err)
	}
}

func TestReadDirRecursiveWalkError(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "a.txt"), []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	result, err := ReadDirRecursive(dir, 1)
	if err != nil || !result.Truncated {
		t.Fatalf("ReadDirRecursive truncated = %#v, %v", result, err)
	}
}

func TestFixPathAbsError(t *testing.T) {
	orig := fixPathAbsFn
	fixPathAbsFn = func(string) (string, error) { return "", errors.New("abs fail") }
	defer func() { fixPathAbsFn = orig }()
	if _, err := FixPath("relative/path"); err == nil {
		t.Fatal("FixPath abs error expected")
	}
}

func TestWinSymlinkDirEmptyPathRemain(t *testing.T) {
	if !WinSymlinkDir("", os.FileMode(winFlagSoftlink<<12)) {
		t.Fatal("WinSymlinkDir empty path softlink expected true")
	}
}

func TestDetectMimeTypeMimeByExtension(t *testing.T) {
	orig := typeByExtensionFn
	typeByExtensionFn = func(ext string) string {
		if ext == ".customext" {
			return "application/custom"
		}
		return orig(ext)
	}
	defer func() { typeByExtensionFn = orig }()

	dir := t.TempDir()
	path := filepath.Join(dir, "file.customext")
	if err := os.WriteFile(path, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(path, nil, false); got != "application/custom" {
		t.Fatalf("DetectMimeType custom ext = %q", got)
	}
}

func TestDetectMimeTypeWithDirEntPipe(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, "sub"), 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, e := range entries {
		if e.IsDir() {
			if got := DetectMimeTypeWithDirEnt(filepath.Join(dir, e.Name()), e); got != "directory" {
				t.Fatalf("DetectMimeTypeWithDirEnt dir = %q", got)
			}
		}
	}
}

func TestReplaceInFilePartialReadWriteErrors(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "ro.txt")
	if err := os.WriteFile(path, []byte("hello"), 0444); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if runtime.GOOS != "windows" {
		if _, err := ReplaceInFilePartial(path, []EditSpec{{OldStr: "hello", NewStr: "world"}}); err == nil {
			t.Fatal("ReplaceInFilePartial write error expected")
		}
	}
}

func TestReadDirNotDirectory(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "file.txt")
	if err := os.WriteFile(path, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := ReadDir(path, 10); err == nil {
		t.Fatal("ReadDir file expected error")
	}
	if _, err := ReadDirRecursive(path, 10); err == nil {
		t.Fatal("ReadDirRecursive file expected error")
	}
}

func TestReadDirRecursiveSymlinkDirSkip(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "target")
	if err := os.Mkdir(target, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(target, "inside.txt"), []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	link := filepath.Join(dir, "linkdir")
	if err := os.Symlink(target, link); err != nil {
		t.Skip("symlinks not supported")
	}
	result, err := ReadDirRecursive(dir, 100)
	if err != nil || len(result.Entries) == 0 {
		t.Fatalf("ReadDirRecursive symlink dir = %#v, %v", result, err)
	}
}

func TestReadDirRecursiveSymlinkDirSkipBranch(t *testing.T) {
	orig := walkDirFn
	defer func() { walkDirFn = orig }()
	walkDirFn = func(root string, fn fs.WalkDirFunc) error {
		linkPath := filepath.Join(root, "linkdir")
		if err := fn(linkPath, fakeSymlinkDirEntry{target: linkPath}, nil); err == fs.SkipDir {
			return nil
		}
		return nil
	}
	if _, err := ReadDirRecursive(t.TempDir(), 10); err != nil {
		t.Fatalf("ReadDirRecursive skip dir: %v", err)
	}
}

type fakeSymlinkDirEntry struct {
	target string
}

func (f fakeSymlinkDirEntry) Name() string               { return filepath.Base(f.target) }
func (f fakeSymlinkDirEntry) IsDir() bool                { return true }
func (f fakeSymlinkDirEntry) Type() fs.FileMode          { return fs.ModeSymlink }
func (f fakeSymlinkDirEntry) Info() (fs.FileInfo, error) {
	return symlinkFakeFileInfo{}, nil
}

type symlinkFakeFileInfo struct{}

func (symlinkFakeFileInfo) Name() string       { return "linkdir" }
func (symlinkFakeFileInfo) Size() int64        { return 0 }
func (symlinkFakeFileInfo) Mode() fs.FileMode  { return fs.ModeSymlink | fs.ModeDir }
func (symlinkFakeFileInfo) ModTime() time.Time { return time.Now() }
func (symlinkFakeFileInfo) IsDir() bool        { return true }
func (symlinkFakeFileInfo) Sys() any           { return nil }

func TestAtomicWriteFileRenameRemoveBothFail(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.txt")
	origRename := atomicWriteRenameFn
	origRemove := atomicWriteRemoveFn
	atomicWriteRenameFn = func(string, string) error { return errors.New("rename fail") }
	atomicWriteRemoveFn = func(string) error { return errors.New("remove fail") }
	defer func() {
		atomicWriteRenameFn = origRename
		atomicWriteRemoveFn = origRemove
	}()
	if err := AtomicWriteFile(path, []byte("data"), 0644); err == nil {
		t.Fatal("AtomicWriteFile rename/remove error expected")
	}
}

func TestReadDirExpandError(t *testing.T) {
	orig := expandHomeDirFn
	expandHomeDirFn = func(string) (string, error) { return "", errors.New("expand fail") }
	defer func() { expandHomeDirFn = orig }()
	if _, err := ReadDir("~/any", 10); err == nil {
		t.Fatal("ReadDir expand error expected")
	}
	if _, err := ReadDirRecursive("~/any", 10); err == nil {
		t.Fatal("ReadDirRecursive expand error expected")
	}
}

func TestReadDirStatAndReadErrors(t *testing.T) {
	if _, err := ReadDir(filepath.Join(t.TempDir(), "missing"), 10); err == nil {
		t.Fatal("ReadDir stat error expected")
	}
	blocker := filepath.Join(t.TempDir(), "notadir")
	if err := os.WriteFile(blocker, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := ReadDir(blocker, 10); err == nil {
		t.Fatal("ReadDir not directory expected error")
	}
}

func TestDetectMimeTypeExtendedZeroRead(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "sparse")
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if err := f.Truncate(64); err != nil {
		t.Fatalf("Truncate: %v", err)
	}
	f.Close()
	if err := os.Chmod(path, 0000); err != nil {
		t.Fatalf("Chmod: %v", err)
	}
	defer os.Chmod(path, 0644)
	if got := DetectMimeType(path, nil, true); got != "" {
		t.Fatalf("DetectMimeType unreadable extended = %q", got)
	}
}

func TestReplaceInFileReadErrorRemain(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "gone.txt")
	if err := os.WriteFile(path, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := readFileFn
	readFileFn = func(string) ([]byte, error) { return nil, errors.New("read fail") }
	defer func() { readFileFn = orig }()
	if err := ReplaceInFile(path, []EditSpec{{OldStr: "x", NewStr: "y"}}); err == nil {
		t.Fatal("ReplaceInFile read error expected")
	}
}

func TestReplaceInFilePartialReadErrorRemain(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "file.txt")
	if err := os.WriteFile(path, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := readFileFn
	readFileFn = func(string) ([]byte, error) { return nil, errors.New("read fail") }
	defer func() { readFileFn = orig }()
	if _, err := ReplaceInFilePartial(path, []EditSpec{{OldStr: "x", NewStr: "y"}}); err == nil {
		t.Fatal("ReplaceInFilePartial read error expected")
	}
}

func TestDetectMimeTypeExtendedDetectedType(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "payload")
	if err := os.WriteFile(path, []byte("<?xml version=\"1.0\"?><root/>"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	got := DetectMimeType(path, nil, true)
	if got == "" || got == "application/octet-stream" {
		t.Fatalf("DetectMimeType xml = %q", got)
	}
}

func TestReadDirPermissionDenied(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "secret")
	if err := os.Mkdir(sub, 0000); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	t.Cleanup(func() { os.Chmod(sub, 0755) })
	if _, err := ReadDir(sub, 10); err == nil {
		t.Fatal("ReadDir permission denied expected error")
	}
}

func TestDetectMimeTypeExtendedZeroBytesRead(t *testing.T) {
	orig := detectMimeReadAtLeast
	detectMimeReadAtLeast = func(io.Reader, []byte, int) (int, error) { return 0, nil }
	defer func() { detectMimeReadAtLeast = orig }()

	dir := t.TempDir()
	path := filepath.Join(dir, "data")
	if err := os.WriteFile(path, []byte("not empty"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(path, nil, true); got != "" {
		t.Fatalf("DetectMimeType zero read = %q", got)
	}
}

type fakePipeDirEntry struct{}

func (fakePipeDirEntry) Name() string               { return "pipe" }
func (fakePipeDirEntry) IsDir() bool                { return false }
func (fakePipeDirEntry) Type() fs.FileMode          { return fs.ModeNamedPipe }
func (fakePipeDirEntry) Info() (fs.FileInfo, error) { return nil, nil }

func TestDetectMimeTypeWithDirEntNamedPipe(t *testing.T) {
	if got := DetectMimeTypeWithDirEnt("/dev/pipe", fakePipeDirEntry{}); got != "pipe" {
		t.Fatalf("DetectMimeTypeWithDirEnt pipe = %q", got)
	}
}

func TestAtomicWriteFileRenameAndRemoveErrors(t *testing.T) {
	dir := t.TempDir()
	blocker := filepath.Join(dir, "blocker")
	if err := os.WriteFile(blocker, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := AtomicWriteFile(filepath.Join(blocker, "out.txt"), []byte("data"), 0644); err == nil {
		t.Fatal("AtomicWriteFile nested path expected write error")
	}
}

type failInfoDirEntry struct {
	name string
	dir  bool
	mode fs.FileMode
}

func (f failInfoDirEntry) Name() string      { return f.name }
func (f failInfoDirEntry) IsDir() bool       { return f.dir }
func (f failInfoDirEntry) Type() fs.FileMode { return f.mode }
func (f failInfoDirEntry) Info() (fs.FileInfo, error) {
	return nil, errors.New("info fail")
}

func TestReadDirEntryInfoError(t *testing.T) {
	orig := readDirFn
	readDirFn = func(string) ([]fs.DirEntry, error) {
		return []fs.DirEntry{failInfoDirEntry{name: "bad", dir: false}}, nil
	}
	defer func() { readDirFn = orig }()
	result, err := ReadDir(t.TempDir(), 10)
	if err != nil || len(result.Entries) != 0 {
		t.Fatalf("ReadDir info error = %#v, %v", result, err)
	}
}

func TestReadDirRecursiveWalkCallbackError(t *testing.T) {
	orig := walkDirFn
	walkDirFn = func(root string, fn fs.WalkDirFunc) error {
		return fn(filepath.Join(root, "child"), nil, errors.New("walk child fail"))
	}
	defer func() { walkDirFn = orig }()
	dir := t.TempDir()
	if _, err := ReadDirRecursive(dir, 10); err != nil {
		t.Fatalf("ReadDirRecursive walk callback: %v", err)
	}
}

func TestReadDirRecursiveWalkInfoError(t *testing.T) {
	orig := walkDirFn
	walkDirFn = func(root string, fn fs.WalkDirFunc) error {
		return fn(filepath.Join(root, "child"), failInfoDirEntry{name: "child"}, nil)
	}
	defer func() { walkDirFn = orig }()
	dir := t.TempDir()
	if _, err := ReadDirRecursive(dir, 10); err != nil {
		t.Fatalf("ReadDirRecursive info error: %v", err)
	}
}

func TestReadDirRecursiveWalkErrors(t *testing.T) {
	orig := walkDirFn
	defer func() { walkDirFn = orig }()
	walkDirFn = func(string, fs.WalkDirFunc) error {
		return fmt.Errorf("walk fail")
	}
	if _, err := ReadDirRecursive(t.TempDir(), 10); err == nil {
		t.Fatal("ReadDirRecursive walk error expected")
	}
}

func TestReadDirRecursiveStatError(t *testing.T) {
	if _, err := ReadDirRecursive(filepath.Join(t.TempDir(), "missing"), 10); err == nil {
		t.Fatal("ReadDirRecursive stat error expected")
	}
}

func TestDetectMimeTypeWithDirEntCharDevice(t *testing.T) {
	got := DetectMimeTypeWithDirEnt("/dev/null", nil)
	if got != "" {
		t.Fatalf("DetectMimeTypeWithDirEnt nil entry = %q", got)
	}
}
