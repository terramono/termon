// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package ds

import (
	"testing"
	"time"
)

func TestExpMap_SetGet(t *testing.T) {
	t.Parallel()
	em := MakeExpMap[string]()
	em.Set("k", "v", time.Now().Add(time.Hour))
	v, ok := em.Get("k")
	if !ok || v != "v" {
		t.Fatalf("got %q ok=%v", v, ok)
	}
}

func TestExpMap_ExpiresStaleKeys(t *testing.T) {
	t.Parallel()
	em := MakeExpMap[int]()
	em.Set("old", 1, time.Now().Add(-time.Second))
	_, ok := em.Get("old")
	if ok {
		t.Fatal("expected expired key missing")
	}
}

func TestExpMap_UpdateKeyRefreshesExpiry(t *testing.T) {
	t.Parallel()
	em := MakeExpMap[int]()
	em.Set("k", 1, time.Now().Add(-time.Hour))
	em.Set("k", 2, time.Now().Add(time.Hour))
	v, ok := em.Get("k")
	if !ok || v != 2 {
		t.Fatalf("got %d ok=%v", v, ok)
	}
}
