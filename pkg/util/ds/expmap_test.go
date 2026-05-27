// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package ds

import (
	"testing"
	"time"
)

func TestExpMapSetGetAndExpire(t *testing.T) {
	t.Parallel()

	em := MakeExpMap[string]()
	em.Set("a", "alpha", time.Now().Add(50*time.Millisecond))
	em.Set("b", "beta", time.Now().Add(time.Hour))

	val, ok := em.Get("a")
	if !ok || val != "alpha" {
		t.Fatalf("Get(a) = %q, ok=%v", val, ok)
	}

	time.Sleep(60 * time.Millisecond)

	_, ok = em.Get("a")
	if ok {
		t.Fatal("expected key a to expire")
	}

	val, ok = em.Get("b")
	if !ok || val != "beta" {
		t.Fatalf("Get(b) after expire = %q, ok=%v", val, ok)
	}
}

func TestExpMapOverwriteUpdatesExpiry(t *testing.T) {
	t.Parallel()

	em := MakeExpMap[int]()
	em.Set("k", 1, time.Now().Add(20*time.Millisecond))
	em.Set("k", 2, time.Now().Add(time.Hour))

	val, ok := em.Get("k")
	if !ok || val != 2 {
		t.Fatalf("Get(k) = %d, ok=%v", val, ok)
	}
}
