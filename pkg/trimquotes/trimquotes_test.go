// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package trimquotes_test

import (
	"testing"

	"github.com/wavetermdev/waveterm/pkg/trimquotes"
)

func TestTrimQuotes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		input    string
		want     string
		wantTrim bool
	}{
		{"quoted string", `"hello"`, "hello", true},
		{"unquoted string", "hello", "hello", false},
		{"invalid quote", `"hello`, `"hello`, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, trimmed := trimquotes.TrimQuotes(tt.input)
			if got != tt.want || trimmed != tt.wantTrim {
				t.Fatalf("TrimQuotes(%q) = (%q, %v), want (%q, %v)", tt.input, got, trimmed, tt.want, tt.wantTrim)
			}
		})
	}
}

func TestTryTrimQuotes(t *testing.T) {
	t.Parallel()

	if got := trimquotes.TryTrimQuotes(`"abc"`); got != "abc" {
		t.Fatalf("TryTrimQuotes = %q, want abc", got)
	}
	if got := trimquotes.TryTrimQuotes("abc"); got != "abc" {
		t.Fatalf("TryTrimQuotes = %q, want abc", got)
	}
}

func TestReplaceQuotes(t *testing.T) {
	t.Parallel()

	if got := trimquotes.ReplaceQuotes("hello", true); got != `"hello"` {
		t.Fatalf("ReplaceQuotes(true) = %q", got)
	}
	if got := trimquotes.ReplaceQuotes("hello", false); got != "hello" {
		t.Fatalf("ReplaceQuotes(false) = %q", got)
	}
}
