// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package daystr

import (
	"testing"
	"time"
)

func TestGetCustomDayStrBowSunday(t *testing.T) {
	if time.Now().Weekday() != time.Sunday {
		t.Skip("bow Sunday branch only applies on Sunday")
	}
	got, err := GetCustomDayStr("bow")
	if err != nil {
		t.Fatalf("GetCustomDayStr bow: %v", err)
	}
	want := time.Now().Format("2006-01-02")
	if got != want {
		t.Fatalf("GetCustomDayStr bow Sunday = %q want %q", got, want)
	}
}

func TestGetCustomDayStrInvalidPrefixFormat(t *testing.T) {
	if _, err := GetCustomDayStr("not-valid"); err == nil {
		t.Fatal("GetCustomDayStr invalid format expected error")
	}
}
