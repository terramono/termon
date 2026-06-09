// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDetectMimeTypeTable(t *testing.T) {
	dir := t.TempDir()

	unknownExt := filepath.Join(dir, "file.xyzunknown")
	if err := os.WriteFile(unknownExt, []byte("hello"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if got := DetectMimeType(unknownExt, nil, false); got != "" {
		t.Fatalf("DetectMimeType non-extended unknown = %q", got)
	}

	jsonPath := filepath.Join(dir, "data.json")
	if err := os.WriteFile(jsonPath, []byte(`{"a":1}`), 0644); err != nil {
		t.Fatalf("WriteFile json: %v", err)
	}
	if got := DetectMimeType(jsonPath, nil, true); got == "" {
		t.Fatal("DetectMimeType json extended expected mime")
	}

	binPath := filepath.Join(dir, "random.unknownext")
	random := make([]byte, 512)
	for i := range random {
		random[i] = byte(i % 251)
	}
	if err := os.WriteFile(binPath, random, 0644); err != nil {
		t.Fatalf("WriteFile bin: %v", err)
	}
	if got := DetectMimeType(binPath, nil, true); got != "" {
		t.Fatalf("DetectMimeType octet-stream expected empty, got %q", got)
	}

	staticPath := filepath.Join(dir, "page.html")
	if err := os.WriteFile(staticPath, []byte("<html></html>"), 0644); err != nil {
		t.Fatalf("WriteFile html: %v", err)
	}
	if got := DetectMimeType(staticPath, nil, false); got == "" {
		t.Fatal("DetectMimeType html static map expected mime")
	}
}

func TestDetectMimeTypeWithDirEntNil(t *testing.T) {
	if got := DetectMimeTypeWithDirEnt("noextension", nil); got != "" {
		t.Fatalf("DetectMimeTypeWithDirEnt nil = %q", got)
	}
}

func TestWinSymlinkDirBranches(t *testing.T) {
	if !WinSymlinkDir("/path/to/dir", os.FileMode(winFlagJunction<<12)) {
		t.Fatal("junction expected directory")
	}
	if WinSymlinkDir("/path/file.txt", os.FileMode(winFlagSoftlink<<12)) {
		t.Fatal("file softlink expected false")
	}
	if WinSymlinkDir("", os.FileMode(0)) {
		t.Fatal("empty path expected false")
	}
}

func TestFixPathBranches(t *testing.T) {
	rel, err := FixPath(".")
	if err != nil || rel == "" {
		t.Fatalf("FixPath . = %q, %v", rel, err)
	}
	withSlash, err := FixPath(rel + "/")
	if err != nil || !strings.HasSuffix(withSlash, "/") {
		t.Fatalf("FixPath trailing slash = %q, %v", withSlash, err)
	}
}

func TestApplyEditErrors(t *testing.T) {
	content := []byte("hello world")
	_, r := applyEdit(content, EditSpec{OldStr: "", NewStr: "x"}, 0)
	if r.Applied || r.Error == "" {
		t.Fatalf("empty old_str = %+v", r)
	}
	_, r = applyEdit(content, EditSpec{OldStr: "missing", NewStr: "x"}, 0)
	if r.Applied {
		t.Fatal("missing old_str should not apply")
	}
	_, r = applyEdit([]byte("aaa bbb aaa"), EditSpec{OldStr: "aaa", NewStr: "x"}, 0)
	if r.Applied {
		t.Fatal("duplicate old_str should not apply")
	}
}

func TestReplaceInFileErrorsFull(t *testing.T) {
	dir := t.TempDir()
	missing := filepath.Join(dir, "missing.txt")
	if err := ReplaceInFile(missing, nil); err == nil {
		t.Fatal("ReplaceInFile missing expected error")
	}

	dirPath := filepath.Join(dir, "subdir")
	if err := os.Mkdir(dirPath, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := ReplaceInFile(dirPath, nil); err == nil {
		t.Fatal("ReplaceInFile directory expected error")
	}

	bigPath := filepath.Join(dir, "big.txt")
	if err := os.WriteFile(bigPath, make([]byte, MaxEditFileSize+1), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := ReplaceInFile(bigPath, []EditSpec{{OldStr: "x", NewStr: "y"}}); err == nil {
		t.Fatal("ReplaceInFile too large expected error")
	}

	filePath := filepath.Join(dir, "sample.txt")
	if err := os.WriteFile(filePath, []byte("same same"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := ReplaceInFile(filePath, []EditSpec{{OldStr: "same", NewStr: "diff"}}); err == nil {
		t.Fatal("ReplaceInFile duplicate expected error")
	}
}

func TestReplaceInFilePartialErrors(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "partial.txt")
	if err := os.WriteFile(filePath, []byte("alpha beta"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	results, err := ReplaceInFilePartial(filePath, []EditSpec{
		{OldStr: "alpha", NewStr: "A"},
		{OldStr: "missing", NewStr: "B"},
		{OldStr: "beta", NewStr: "C"},
	})
	if err != nil {
		t.Fatalf("ReplaceInFilePartial: %v", err)
	}
	if results[0].Applied != true || results[1].Applied != false || results[2].Applied != false {
		t.Fatalf("results = %+v", results)
	}
	if results[2].Error != "previous edit failed" {
		t.Fatalf("results[2] = %+v", results[2])
	}
}

func TestAtomicWriteFileRenameError(t *testing.T) {
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

func TestReadDirErrorsAndTruncate(t *testing.T) {
	if _, err := ReadDir(filepath.Join(t.TempDir(), "missing"), 10); err == nil {
		t.Fatal("ReadDir missing expected error")
	}

	dir := t.TempDir()
	filePath := filepath.Join(dir, "onlyfile.txt")
	if err := os.WriteFile(filePath, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := ReadDir(filePath, 10); err == nil {
		t.Fatal("ReadDir file expected error")
	}

	for i := 0; i < 5; i++ {
		name := filepath.Join(dir, string(rune('a'+i))+".txt")
		if err := os.WriteFile(name, []byte("x"), 0644); err != nil {
			t.Fatalf("WriteFile: %v", err)
		}
	}
	result, err := ReadDir(dir, 2)
	if err != nil || !result.Truncated || result.EntryCount != 2 {
		t.Fatalf("ReadDir truncate = %#v, %v", result, err)
	}
}

func TestReadDirRecursiveTruncate(t *testing.T) {
	dir := t.TempDir()
	for i := 0; i < 5; i++ {
		name := filepath.Join(dir, string(rune('a'+i))+".txt")
		if err := os.WriteFile(name, []byte("x"), 0644); err != nil {
			t.Fatalf("WriteFile: %v", err)
		}
	}
	result, err := ReadDirRecursive(dir, 2)
	if err != nil || !result.Truncated || result.EntryCount != 2 {
		t.Fatalf("ReadDirRecursive truncate = %#v, %v", result, err)
	}
}
