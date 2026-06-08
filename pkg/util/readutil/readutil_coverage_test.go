// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadLastNLineOffsetsAndTail(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "lines.txt")
	content := strings.Repeat("line\n", 30)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	offsets, total, err := ReadLastNLineOffsets(file, 5, true)
	if err != nil || total < 5 || len(offsets) == 0 {
		t.Fatalf("ReadLastNLineOffsets = %#v total=%d err=%v", offsets, total, err)
	}

	lines, reason, err := ReadTailLines(file, 5, 0, 4096)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) != 5 {
		t.Fatalf("ReadTailLines lines = %d", len(lines))
	}
	_ = reason

	if _, _, err := ReadTailLines(file, 1, 0, 0); err == nil {
		t.Fatal("ReadTailLines invalid readLimit expected error")
	}
}

func TestReadLinesSkipAndLimits(t *testing.T) {
	reader := strings.NewReader("a\nb\nc\n")
	lines, reason, err := ReadLines(reader, 0, 1, 3)
	if err != nil || reason != StopReasonReadLimit || len(lines) != 1 || lines[0] != "b\n" {
		t.Fatalf("ReadLines skip/limit = %#v %q %v", lines, reason, err)
	}
}
