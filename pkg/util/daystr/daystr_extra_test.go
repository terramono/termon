// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package daystr

import (
	"testing"
	"time"
)

func TestGetCustomDayStrDeltaOnly(t *testing.T) {
	t.Parallel()

	expected := time.Now().AddDate(0, 0, 3).Format("2006-01-02")
	got, err := GetCustomDayStr("+3d")
	if err != nil {
		t.Fatalf("GetCustomDayStr(+3d): %v", err)
	}
	if got != expected {
		t.Fatalf("GetCustomDayStr(+3d) = %q, want %q", got, expected)
	}
}

func TestGetCustomDayStrBowOnSunday(t *testing.T) {
	t.Parallel()

	now := time.Now()
	if now.Weekday() != time.Sunday {
		t.Skip("bow-on-sunday branch only runs on Sundays")
	}
	got, err := GetCustomDayStr("bow")
	if err != nil {
		t.Fatalf("GetCustomDayStr(bow): %v", err)
	}
	if got != now.Format("2006-01-02") {
		t.Fatalf("GetCustomDayStr(bow) on Sunday = %q", got)
	}
}

func TestGetCustomDayStrInvalidPrefixDate(t *testing.T) {
	t.Parallel()

	_, err := GetCustomDayStr("2025-00-01")
	if err == nil {
		t.Fatal("expected error for invalid calendar date prefix")
	}
}
