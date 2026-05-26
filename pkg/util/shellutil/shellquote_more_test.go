// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import "testing"

func TestHardQuoteFishEscapesSpecialChars(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"empty", "", `""`},
		{"safe literal", "path/to/file", "path/to/file"},
		{"dollar", "has $dollar", `"has \$dollar"`},
		{"double quote", `say "hi"`, `"say \"hi\""`},
		{"backtick preserved", "`cmd`", "\"`cmd`\""},
		{"backslash", `back\slash`, `"back\\slash"`},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := HardQuoteFish(tc.input); got != tc.want {
				t.Fatalf("HardQuoteFish(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestHardQuotePowerShellEscapesSpecialChars(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"empty", "", `""`},
		{"safe literal", "simple-path", "\"simple-path\""},
		{"dollar", "cost $5", "\"cost `$5\""},
		{"newline", "line\nbreak", "\"line`n\nbreak\""},
		{"double quote", `say "hi"`, "\"say `\"hi`\"\""},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := HardQuotePowerShell(tc.input); got != tc.want {
				t.Fatalf("HardQuotePowerShell(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestHardQuoteEscapesBacktick(t *testing.T) {
	t.Parallel()

	got := HardQuote("`danger`")
	if got != "\"\\`danger\\`\"" {
		t.Fatalf("HardQuote backtick = %q", got)
	}
}
