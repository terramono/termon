// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wavebase

import "testing"

func TestValidateWshSupportedArchTable(t *testing.T) {
	t.Parallel()

	tests := []struct {
		os    string
		arch  string
		valid bool
	}{
		{"linux", "x64", true},
		{"darwin", "arm64", true},
		{"windows", "x64", true},
		{"freebsd", "x64", false},
	}

	for _, tt := range tests {
		err := ValidateWshSupportedArch(tt.os, tt.arch)
		if tt.valid && err != nil {
			t.Fatalf("ValidateWshSupportedArch(%q, %q): %v", tt.os, tt.arch, err)
		}
		if !tt.valid && err == nil {
			t.Fatalf("ValidateWshSupportedArch(%q, %q) expected error", tt.os, tt.arch)
		}
	}
}

func TestExpandHomeDirSafe(t *testing.T) {
	t.Parallel()

	home := GetHomeDir()
	if got := ExpandHomeDirSafe("~/tmp"); got != home+"/tmp" && got != home+"\\tmp" {
		t.Fatalf("ExpandHomeDirSafe = %q", got)
	}
	if got := ExpandHomeDirSafe("/absolute/path"); got != "/absolute/path" {
		t.Fatalf("absolute path = %q", got)
	}
}
