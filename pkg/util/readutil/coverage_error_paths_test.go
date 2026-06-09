// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"bytes"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
)

type errReadSeeker struct {
	*bytes.Reader
	readErr error
}

func (e errReadSeeker) Read(p []byte) (int, error) {
	if e.readErr != nil {
		return 0, e.readErr
	}
	return e.Reader.Read(p)
}

func TestReadLastNLineOffsetsReadError(t *testing.T) {
	rs := errReadSeeker{Reader: bytes.NewReader([]byte("a\n")), readErr: errors.New("read fail")}
	if _, _, err := ReadLastNLineOffsets(rs, 2, false); err == nil {
		t.Fatal("ReadLastNLineOffsets read error expected")
	}
}

func TestReadTailLinesStopReasonBOFExact(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/five.txt"
	content := strings.Repeat("x\n", 5)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, stop, err := ReadTailLines(file, 5, 0, 1024*1024)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) != 5 || stop != StopReasonBOF {
		t.Fatalf("lines=%d stop=%q", len(lines), stop)
	}
}

func TestReadTailLinesStopReasonReadLimit(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/big.txt"
	var b strings.Builder
	for i := 0; i < 2000; i++ {
		b.WriteString("line content here\n")
	}
	if err := os.WriteFile(path, []byte(b.String()), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, stop, err := ReadTailLines(file, 100, 0, 512)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("expected some lines")
	}
	if stop != StopReasonReadLimit && stop != StopReasonBOF && stop != "" {
		t.Fatalf("stop = %q", stop)
	}
}

func TestReadTailLinesDoublingLoop(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/medium.txt"
	if err := os.WriteFile(path, []byte(strings.Repeat("row\n", 400)), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, _, err := ReadTailLines(file, 50, 0, 8192)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) != 50 {
		t.Fatalf("lines = %d", len(lines))
	}
}

func TestReadTailLinesInternalSeekError(t *testing.T) {
	rs := errSeeker{bytes.NewReader([]byte("a\nb\nc\n"))}
	if _, _, err := readTailLinesInternal(rs, 1, 0, false); err == nil {
		t.Fatal("readTailLinesInternal seek error expected")
	}
}

func TestReadLinesReaderError(t *testing.T) {
	r := errReadSeeker{Reader: bytes.NewReader([]byte("a\n")), readErr: io.ErrUnexpectedEOF}
	if _, _, err := ReadLines(r, 0, 0, 0); err == nil {
		t.Fatal("ReadLines reader error expected")
	}
}
