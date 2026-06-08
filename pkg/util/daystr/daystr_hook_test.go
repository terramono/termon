// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package daystr

import (
	"testing"
	"time"
)

func TestGetCustomDayStrBowSundayHooked(t *testing.T) {
	sunday := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	orig := daystrNowFn
	daystrNowFn = func() time.Time { return sunday }
	defer func() { daystrNowFn = orig }()

	got, err := GetCustomDayStr("bow")
	if err != nil || got != "2026-06-07" {
		t.Fatalf("GetCustomDayStr bow Sunday = %q, %v", got, err)
	}
}

func TestGetCustomDayStrInvalidZeroDate(t *testing.T) {
	if _, err := GetCustomDayStr("0000-00-00"); err == nil {
		t.Fatal("GetCustomDayStr 0000-00-00 expected error")
	}
}
