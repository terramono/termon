// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package daystr

import (
	"testing"
)

func TestGetCustomDayStrTable(t *testing.T) {
	cases := []struct {
		input   string
		wantErr bool
	}{
		{"bow", false},
		{"bom", false},
		{"yesterday", false},
		{"today+1d", false},
		{"today+1w-2d", false},
		{"2025-04-01+1w", false},
		{"invalid", true},
		{"bad-prefix", true},
	}
	for _, tc := range cases {
		got, err := GetCustomDayStr(tc.input)
		if tc.wantErr {
			if err == nil {
				t.Fatalf("GetCustomDayStr(%q) expected error, got %q", tc.input, got)
			}
			continue
		}
		if err != nil || got == "" {
			t.Fatalf("GetCustomDayStr(%q) = %q, %v", tc.input, got, err)
		}
	}
}

func TestGetCurAndRelDayStr(t *testing.T) {
	if GetCurDayStr() == "" {
		t.Fatal("GetCurDayStr empty")
	}
	if GetRelDayStr(1) == "" || GetRelDayStr(-1) == "" {
		t.Fatal("GetRelDayStr empty")
	}
}
