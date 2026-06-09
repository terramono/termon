// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"bytes"
	"os"
	"strings"
	"testing"
)

func TestReadTailLinesExactCount(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/exact.txt"
	lines := strings.Repeat("row\n", 20)
	if err := os.WriteFile(path, []byte(lines), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	got, stop, err := ReadTailLines(file, 10, 2, 64*1024)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(got) != 10 {
		t.Fatalf("lines = %d", len(got))
	}
	if stop != "" && stop != StopReasonBOF {
		t.Fatalf("stop = %q", stop)
	}
}

func TestReadTailLinesInternalHasMore(t *testing.T) {
	content := strings.Repeat("line\n", 20)
	rs := bytes.NewReader([]byte(content))
	got, hasMore, err := readTailLinesInternal(rs, 5, 2, true)
	if err != nil || len(got) == 0 {
		t.Fatalf("readTailLinesInternal = %#v, %v, %v", got, hasMore, err)
	}
	if !hasMore {
		t.Fatal("readTailLinesInternal expected hasMore")
	}
}

func TestReadLastNLineOffsetsNoKeepFirst(t *testing.T) {
	content := "a\nb\nc\n"
	rs := bytes.NewReader([]byte(content))
	offsets, total, err := ReadLastNLineOffsets(rs, 2, false)
	if err != nil || total < 2 {
		t.Fatalf("offsets=%#v total=%d err=%v", offsets, total, err)
	}
}
