// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package ds

import "testing"

func TestSyncMapSetUnless(t *testing.T) {
	t.Parallel()

	sm := MakeSyncMap[string]()
	if !sm.SetUnless("key", "first") {
		t.Fatal("SetUnless expected true on first insert")
	}
	if sm.SetUnless("key", "second") {
		t.Fatal("SetUnless expected false when key exists")
	}
	if sm.Get("key") != "first" {
		t.Fatalf("value = %q, want first", sm.Get("key"))
	}
}

func TestSyncMapTestAndSet(t *testing.T) {
	t.Parallel()

	sm := MakeSyncMap[int]()
	if !sm.TestAndSet("count", 1, func(_ int, exists bool) bool { return !exists }) {
		t.Fatal("TestAndSet expected true when key missing")
	}
	if sm.TestAndSet("count", 2, func(_ int, exists bool) bool { return !exists }) {
		t.Fatal("TestAndSet expected false when key exists")
	}
	if sm.Get("count") != 1 {
		t.Fatalf("count = %d, want 1", sm.Get("count"))
	}
	if !sm.TestAndSet("count", 5, func(current int, _ bool) bool { return current < 3 }) {
		t.Fatal("TestAndSet expected true when predicate passes")
	}
	if sm.Get("count") != 5 {
		t.Fatalf("count = %d, want 5", sm.Get("count"))
	}
}

func TestSyncMapGetOrCreate(t *testing.T) {
	t.Parallel()

	sm := MakeSyncMap[int]()
	calls := 0
	created := sm.GetOrCreate("key", func() int {
		calls++
		return 42
	})
	if created != 42 || calls != 1 {
		t.Fatalf("GetOrCreate first = %d calls = %d", created, calls)
	}
	again := sm.GetOrCreate("key", func() int {
		calls++
		return 99
	})
	if again != 42 || calls != 1 {
		t.Fatalf("GetOrCreate cached = %d calls = %d", again, calls)
	}
}
