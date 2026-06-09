// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package ds

import (
	"testing"
	"time"
)

func TestExpMapHeapComparatorAndExpiry(t *testing.T) {
	em := MakeExpMap[string]()
	now := time.Now()
	em.Set("a", "one", now.Add(-time.Minute))
	em.Set("b", "two", now.Add(time.Minute))
	em.Set("c", "three", now.Add(-time.Minute))

	if _, ok := em.Get("a"); ok {
		t.Fatal("expired key a expected missing")
	}
	if val, ok := em.Get("b"); !ok || val != "two" {
		t.Fatalf("Get b = %q, %v", val, ok)
	}

	if heapComparator(expEntry{Exp: now}, expEntry{Exp: now.Add(time.Second)}) >= 0 {
		t.Fatal("heapComparator earlier expected -1")
	}
	if heapComparator(expEntry{Exp: now.Add(time.Second)}, expEntry{Exp: now}) <= 0 {
		t.Fatal("heapComparator later expected 1")
	}
	if heapComparator(expEntry{Exp: now}, expEntry{Exp: now}) != 0 {
		t.Fatal("heapComparator equal expected 0")
	}
}
