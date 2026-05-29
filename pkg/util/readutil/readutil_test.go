// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package readutil

import (
	"bytes"
	"strings"
	"testing"
)

func TestReadLinesTable(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     string
		lineCount int
		skipLines int
		readLimit int
		wantLines []string
		wantStop  string
	}{
		{
			name:      "all lines",
			input:     "a\nb\nc\n",
			wantLines: []string{"a\n", "b\n", "c\n"},
			wantStop:  StopReasonEOF,
		},
		{
			name:      "line count limit",
			input:     "a\nb\nc\n",
			lineCount: 2,
			wantLines: []string{"a\n", "b\n"},
		},
		{
			name:      "skip lines",
			input:     "a\nb\nc\n",
			skipLines: 1,
			wantLines: []string{"b\n", "c\n"},
			wantStop:  StopReasonEOF,
		},
		{
			name:      "read limit",
			input:     "aaaa\nbbbb\n",
			readLimit: 5,
			wantLines: []string{"aaaa\n"},
			wantStop:  StopReasonReadLimit,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lines, stop, err := ReadLines(strings.NewReader(tt.input), tt.lineCount, tt.skipLines, tt.readLimit)
			if err != nil {
				t.Fatalf("ReadLines: %v", err)
			}
			if len(lines) != len(tt.wantLines) {
				t.Fatalf("lines = %#v, want %#v", lines, tt.wantLines)
			}
			for i := range tt.wantLines {
				if lines[i] != tt.wantLines[i] {
					t.Fatalf("line %d = %q, want %q", i, lines[i], tt.wantLines[i])
				}
			}
			if stop != tt.wantStop {
				t.Fatalf("stop = %q, want %q", stop, tt.wantStop)
			}
		})
	}
}

func TestReadLastNLineOffsets(t *testing.T) {
	t.Parallel()

	offsets, total, err := ReadLastNLineOffsets(bytes.NewReader([]byte("a\nb\nc\n")), 2, true)
	if err != nil {
		t.Fatalf("ReadLastNLineOffsets: %v", err)
	}
	if total != 3 {
		t.Fatalf("total = %d, want 3", total)
	}
	if len(offsets) != 2 {
		t.Fatalf("offsets = %#v", offsets)
	}
}

func TestReadTailLinesInternal(t *testing.T) {
	t.Parallel()

	lines, hasMore, err := readTailLinesInternal(bytes.NewReader([]byte("one\ntwo\nthree\nfour\n")), 2, 1, true)
	if err != nil {
		t.Fatalf("readTailLinesInternal: %v", err)
	}
	if len(lines) != 2 || lines[0] != "two\n" || lines[1] != "three\n" {
		t.Fatalf("lines = %#v", lines)
	}
	if !hasMore {
		t.Fatal("expected hasMore true")
	}
}
