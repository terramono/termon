// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package ds

import (
	"testing"
	"time"
)

func TestExpMap_SetUpdatesValueAndExpiry(t *testing.T) {
	t.Parallel()

	m := MakeExpMap[string]()
	m.Set("key", "first", time.Now().Add(time.Hour))
	m.Set("key", "second", time.Now().Add(2*time.Hour))

	val, ok := m.Get("key")
	if !ok || val != "second" {
		t.Fatalf("Get = %q, ok=%v", val, ok)
	}
}

func TestExpMap_ExpireItemsRemovesStaleHeapEntries(t *testing.T) {
	t.Parallel()

	m := MakeExpMap[int]()
	m.Set("stale", 1, time.Now().Add(-time.Minute))
	m.Set("fresh", 2, time.Now().Add(time.Hour))

	if _, ok := m.Get("stale"); ok {
		t.Fatal("expected stale key removed")
	}
	if val, ok := m.Get("fresh"); !ok || val != 2 {
		t.Fatalf("fresh = %v, ok=%v", val, ok)
	}
}
