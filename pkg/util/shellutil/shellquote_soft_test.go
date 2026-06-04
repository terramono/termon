// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import "testing"

func TestSoftQuoteTable(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input string
		want  string
	}{
		{"", `""`},
		{"plain", "plain"},
		{`has"quote`, `"has\"quote"`},
		{"~/docs", "~/docs"},
		{"~/my docs", `~"/my docs"`},
		{"~", "~"},
	}

	for _, tt := range tests {
		if got := SoftQuote(tt.input); got != tt.want {
			t.Fatalf("SoftQuote(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestSoftQuoteTildePaths(t *testing.T) {
	t.Parallel()

	if got := SoftQuote("~"); got != "~" {
		t.Fatalf("SoftQuote(~) = %q", got)
	}
	if got := SoftQuote("~/projects"); got != "~/projects" {
		t.Fatalf("SoftQuote(~/projects) = %q", got)
	}
}

func TestHardQuoteEmptyAndSafe(t *testing.T) {
	t.Parallel()

	if got := HardQuote(""); got != `""` {
		t.Fatalf("HardQuote empty = %q", got)
	}
	if got := HardQuote("safe_value"); got != "safe_value" {
		t.Fatalf("HardQuote safe = %q", got)
	}
}
