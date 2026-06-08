// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type failReadAfterOffsetReader struct {
	*bytes.Reader
	totalRead int
	failAfter int
}

func (f *failReadAfterOffsetReader) Read(p []byte) (int, error) {
	if f.totalRead >= f.failAfter {
		return 0, errors.New("read fail after offset")
	}
	n, err := f.Reader.Read(p)
	f.totalRead += n
	return n, err
}

func TestReadTailLinesStatError(t *testing.T) {
	file, err := os.Open(os.DevNull)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	file.Close()
	if _, _, err := ReadTailLines(file, 1, 0, 1024); err == nil {
		t.Fatal("ReadTailLines closed file expected error")
	}
}

func TestReadTailLinesInternalReadLinesError(t *testing.T) {
	content := []byte(strings.Repeat("line\n", 30))
	r := &failReadAfterOffsetReader{
		Reader:    bytes.NewReader(content),
		failAfter: len(content) - 5,
	}
	if _, _, err := readTailLinesInternal(r, 5, 0, true); err == nil {
		t.Fatal("readTailLinesInternal ReadLines error expected")
	}
}

func TestReadTailLinesCapReadBytesToLimit(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cap.txt")
	if err := os.WriteFile(path, []byte(strings.Repeat("abcdefghij\n", 500)), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, _, err := ReadTailLines(file, 200, 0, 1500)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("expected lines")
	}
}

func TestReadTailLinesInternalReadLinesErrorRemain(t *testing.T) {
	content := []byte(strings.Repeat("line\n", 30))
	r := &failReadAfterOffsetReader{
		Reader:    bytes.NewReader(content),
		failAfter: len(content) - 1,
	}
	if _, _, err := readTailLinesInternal(r, 3, 0, true); err == nil {
		t.Fatal("readTailLinesInternal ReadLines error expected")
	}
}

func TestReadTailLinesErrorFromInternal(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "one.txt")
	if err := os.WriteFile(path, []byte("only\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()
	if err := file.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if _, _, err := ReadTailLines(file, 1, 0, 1024); err == nil {
		t.Fatal("ReadTailLines closed file internal error expected")
	}
}

type failSeekAtReader struct {
	*bytes.Reader
	seekCount int
	failAt    int
}

func (f *failSeekAtReader) Seek(offset int64, whence int) (int64, error) {
	f.seekCount++
	if f.seekCount >= f.failAt {
		return 0, errors.New("seek fail")
	}
	return f.Reader.Seek(offset, whence)
}

func TestReadTailLinesSeekErrorInInternal(t *testing.T) {
	content := []byte(strings.Repeat("line\n", 20))
	r := &failSeekAtReader{Reader: bytes.NewReader(content), failAt: 2}
	if _, _, err := readTailLinesInternal(r, 5, 2, true); err == nil {
		t.Fatal("readTailLinesInternal seek error expected")
	}
}

func TestReadTailLinesInternalReadLinesHookError(t *testing.T) {
	orig := readLinesInternalFn
	readLinesInternalFn = func(io.Reader, int, int, int) ([]string, string, error) {
		return nil, "", errors.New("read lines fail")
	}
	defer func() { readLinesInternalFn = orig }()
	rs := bytes.NewReader([]byte(strings.Repeat("line\n", 10)))
	if _, _, err := readTailLinesInternal(rs, 3, 0, true); err == nil {
		t.Fatal("readTailLinesInternal ReadLines hook error expected")
	}
}

func TestReadTailLinesInternalErrorPropagation(t *testing.T) {
	orig := readLinesInternalFn
	readLinesInternalFn = func(io.Reader, int, int, int) ([]string, string, error) {
		return nil, "", errors.New("propagate fail")
	}
	defer func() { readLinesInternalFn = orig }()
	dir := t.TempDir()
	path := filepath.Join(dir, "lines.txt")
	if err := os.WriteFile(path, []byte(strings.Repeat("a\n", 20)), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()
	if _, _, err := ReadTailLines(file, 5, 0, 64*1024); err == nil {
		t.Fatal("ReadTailLines internal error expected")
	}
}

func TestReadTailLinesDoublingCapToLimit(t *testing.T) {
	origInitial := readTailInitialBytes
	readTailInitialBytes = 64 * 1024
	defer func() { readTailInitialBytes = origInitial }()

	dir := t.TempDir()
	path := filepath.Join(dir, "biglines.txt")
	var b strings.Builder
	for i := 0; i < 5000; i++ {
		b.WriteString(strings.Repeat("x", 200))
		b.WriteByte('\n')
	}
	if err := os.WriteFile(path, []byte(b.String()), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	readLimit := int64(100 * 1024)
	lines, _, err := ReadTailLines(file, 500, 0, readLimit)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("expected lines from doubling loop")
	}
}
