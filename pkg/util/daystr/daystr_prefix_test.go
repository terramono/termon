// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package daystr

import (
	"testing"
	"time"
)

func TestGetCustomDayStrPrefixTable(t *testing.T) {
	t.Parallel()

	now := time.Now()
	tests := []struct {
		format string
		want   string
	}{
		{"today+1d", now.AddDate(0, 0, 1).Format("2006-01-02")},
		{"yesterday-1d", now.AddDate(0, 0, -2).Format("2006-01-02")},
		{"bom+1d", time.Date(now.Year(), now.Month(), 2, 0, 0, 0, 0, now.Location()).Format("2006-01-02")},
		{"2025-06-15-2w", "2025-06-01"},
	}

	for _, tt := range tests {
		got, err := GetCustomDayStr(tt.format)
		if err != nil {
			t.Fatalf("GetCustomDayStr(%q): %v", tt.format, err)
		}
		if got != tt.want {
			t.Fatalf("GetCustomDayStr(%q) = %q, want %q", tt.format, got, tt.want)
		}
	}
}

func TestGetCustomDayStrInvalidFormat(t *testing.T) {
	t.Parallel()

	_, err := GetCustomDayStr("not-a-daystr")
	if err == nil {
		t.Fatal("expected error for invalid format")
	}
}
