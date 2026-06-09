// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"os"
	"strings"
	"testing"
)

func TestReadTailLinesSmallFileBOF(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/small.txt"
	if err := os.WriteFile(path, []byte("one\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, stop, err := ReadTailLines(file, 5, 0, 1024)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("ReadTailLines expected lines")
	}
	if stop != StopReasonBOF && stop != "" {
		t.Fatalf("stop = %q", stop)
	}
}

func TestReadTailLinesLargeReadLimit(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/big.txt"
	content := strings.Repeat("row\n", 200)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer file.Close()

	lines, _, err := ReadTailLines(file, 10, 5, 2048)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) != 10 {
		t.Fatalf("lines = %d", len(lines))
	}
}
