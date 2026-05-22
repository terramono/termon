// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import "testing"

func TestIsValidEnvVarName(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"simple", "HOME", true},
		{"underscore start", "_TMP", true},
		{"with digits", "PATH2", true},
		{"starts with digit", "2BAD", false},
		{"contains dash", "MY-VAR", false},
		{"empty", "", false},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsValidEnvVarName(tc.input); got != tc.want {
				t.Fatalf("IsValidEnvVarName(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestHardQuoteFish(t *testing.T) {
	t.Parallel()

	if got := HardQuoteFish("simple"); got != "simple" {
		t.Fatalf("HardQuoteFish simple: got %q", got)
	}
	if got := HardQuoteFish("has $dollar"); got != `"has \$dollar"` {
		t.Fatalf("HardQuoteFish dollar: got %q", got)
	}
}

func TestHardQuotePowerShell(t *testing.T) {
	t.Parallel()

	if got := HardQuotePowerShell("line\nbreak"); got != "\"line`n\nbreak\"" {
		t.Fatalf("HardQuotePowerShell newline: got %q", got)
	}
	if got := HardQuotePowerShell(`say "hi"`); got != "\"say `\"hi`\"\"" {
		t.Fatalf("HardQuotePowerShell quote: got %q", got)
	}
}
