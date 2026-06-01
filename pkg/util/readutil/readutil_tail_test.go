// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"os"
	"strings"
	"testing"
)

func TestReadTailLines(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := dir + "/tail.txt"
	content := strings.Repeat("line\n", 20)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("open file: %v", err)
	}
	defer file.Close()

	lines, stop, err := ReadTailLines(file, 3, 2, 4096)
	if err != nil {
		t.Fatalf("ReadTailLines: %v", err)
	}
	if len(lines) != 3 {
		t.Fatalf("lines = %d, want 3", len(lines))
	}
	if stop != "" && stop != StopReasonBOF {
		t.Fatalf("stop = %q", stop)
	}
}

func TestReadTailLinesRejectsNonPositiveLimit(t *testing.T) {
	t.Parallel()

	file, err := os.CreateTemp("", "readtail-*")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	defer os.Remove(file.Name())
	defer file.Close()

	if _, _, err := ReadTailLines(file, 1, 0, 0); err == nil {
		t.Fatal("expected error for non-positive readLimit")
	}
}
