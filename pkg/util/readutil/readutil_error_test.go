// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"errors"
	"io"
	"strings"
	"testing"
)

type failReader struct{}

func (failReader) Read([]byte) (int, error) {
	return 0, errors.New("read failed")
}

func TestReadLinesPropagatesReadError(t *testing.T) {
	t.Parallel()

	_, _, err := ReadLines(failReader{}, 0, 0, 0)
	if err == nil {
		t.Fatal("expected read error")
	}
}

type seekFailReader struct {
	data string
	pos  int
}

func (r *seekFailReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	return n, nil
}

func (r *seekFailReader) Seek(int64, int) (int64, error) {
	return 0, errors.New("seek failed")
}

func TestReadLastNLineOffsetsPropagatesSeekError(t *testing.T) {
	t.Parallel()

	_, _, err := ReadLastNLineOffsets(&seekFailReader{data: "a\n"}, 1, true)
	if err == nil {
		t.Fatal("expected seek error")
	}
}

func TestReadLinesStopsAtLineCountWithoutEOF(t *testing.T) {
	t.Parallel()

	lines, stop, err := ReadLines(strings.NewReader("a\nb\nc\n"), 1, 0, 0)
	if err != nil {
		t.Fatalf("ReadLines: %v", err)
	}
	if len(lines) != 1 || lines[0] != "a\n" {
		t.Fatalf("lines = %#v", lines)
	}
	if stop != "" {
		t.Fatalf("stop = %q, want empty", stop)
	}
}
