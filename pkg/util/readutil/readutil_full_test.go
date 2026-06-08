// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

func TestReadLinesLimits(t *testing.T) {
	input := "a\nb\nc\nd\n"
	lines, reason, err := ReadLines(strings.NewReader(input), 2, 1, 0)
	if err != nil || reason != "" || len(lines) != 2 || lines[0] != "b\n" {
		t.Fatalf("ReadLines lineCount = %#v, %q, %v", lines, reason, err)
	}

	lines, reason, err = ReadLines(strings.NewReader(input), 0, 0, 3)
	if err != nil || reason != StopReasonReadLimit || len(lines) == 0 {
		t.Fatalf("ReadLines readLimit = %#v, %q, %v", lines, reason, err)
	}
}

type errSeeker struct {
	*bytes.Reader
}

func (errSeeker) Seek(int64, int) (int64, error) {
	return 0, io.ErrUnexpectedEOF
}

func TestReadLastNLineOffsetsErrors(t *testing.T) {
	if _, _, err := ReadLastNLineOffsets(errSeeker{bytes.NewReader([]byte("a\n"))}, 5, false); err == nil {
		t.Fatal("ReadLastNLineOffsets seek error expected")
	}
}

func TestReadTailLinesInternalBranches(t *testing.T) {
	content := "one\ntwo\nthree\nfour\nfive\n"
	rs := bytes.NewReader([]byte(content))

	lines, hasMore, err := readTailLinesInternal(rs, 2, 1, true)
	if err != nil || len(lines) == 0 {
		t.Fatalf("readTailLinesInternal = %#v, %v, %v", lines, hasMore, err)
	}

	rs = bytes.NewReader([]byte("only\n"))
	lines, hasMore, err = readTailLinesInternal(rs, 5, 10, true)
	if err != nil || len(lines) != 0 || hasMore {
		t.Fatalf("readTailLinesInternal offset > total = %#v, %v, %v", lines, hasMore, err)
	}
}

func TestReadTailLinesInvalidLimit(t *testing.T) {
	file, err := os.CreateTemp("", "tail-*.txt")
	if err != nil {
		t.Fatalf("CreateTemp: %v", err)
	}
	defer os.Remove(file.Name())
	defer file.Close()

	if _, _, err := ReadTailLines(file, 5, 0, 0); err == nil {
		t.Fatal("ReadTailLines zero readLimit expected error")
	}
}

func TestReadTailLinesReadLimitPath(t *testing.T) {
	dir := t.TempDir()
	path := filepathJoin(dir, "many.txt")
	var b strings.Builder
	for i := 0; i < 500; i++ {
		b.WriteString("line\n")
	}
	if err := os.WriteFile(path, []byte(b.String()), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, stop, err := ReadTailLines(file, 10, 0, 256)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("ReadTailLines expected lines")
	}
	if stop != StopReasonReadLimit && stop != "" {
		t.Fatalf("stop = %q", stop)
	}
}

func filepathJoin(dir, name string) string {
	return dir + "/" + name
}
