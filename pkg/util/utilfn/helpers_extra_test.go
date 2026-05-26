// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"testing"
)

func TestConvertIntAndGetBool(t *testing.T) {
	t.Parallel()

	if got := ConvertInt(int64(42)); got != 42 {
		t.Fatalf("ConvertInt int64 = %d", got)
	}
	if got := ConvertInt(float64(7)); got != 7 {
		t.Fatalf("ConvertInt float64 = %d", got)
	}
	if got := ConvertInt("bad"); got != 0 {
		t.Fatalf("ConvertInt bad = %d", got)
	}

	m := map[string]any{"enabled": true, "missing": false}
	if !GetBool(m, "enabled") {
		t.Fatal("GetBool enabled expected true")
	}
	if GetBool(m, "missing") {
		t.Fatal("GetBool missing expected false")
	}
}

func TestByteMapsEqualAndConvertMap(t *testing.T) {
	t.Parallel()

	m1 := map[string][]byte{"a": []byte("1")}
	m2 := map[string][]byte{"a": []byte("1")}
	if !ByteMapsEqual(m1, m2) {
		t.Fatal("ByteMapsEqual expected true")
	}
	if ByteMapsEqual(m1, map[string][]byte{"a": []byte("2")}) {
		t.Fatal("ByteMapsEqual expected false for different values")
	}

	converted := ConvertMap(map[string]any{"key": "value"})
	if converted["key"] != "value" {
		t.Fatalf("ConvertMap = %#v", converted)
	}
	if ConvertMap("not-a-map") != nil {
		t.Fatal("ConvertMap bad type expected nil")
	}
}

func TestSafeDerefPtrAndShellQuote(t *testing.T) {
	t.Parallel()

	val := 42
	if SafeDeref(&val) != 42 {
		t.Fatal("SafeDeref failed")
	}
	if SafeDeref[int](nil) != 0 {
		t.Fatal("SafeDeref nil failed")
	}
	if Ptr(7) == nil || *Ptr(7) != 7 {
		t.Fatal("Ptr failed")
	}

	if got := ShellQuote("safe/path", false, 100); got != "safe/path" {
		t.Fatalf("ShellQuote safe = %q", got)
	}
	if got := ShellQuote("has space", false, 100); got == "has space" {
		t.Fatalf("ShellQuote spaced = %q", got)
	}
}

func TestParseToSPAndStrWithPos(t *testing.T) {
	t.Parallel()

	sp := ParseToSP("hello")
	if sp.Str != "hello" || sp.Pos != NoStrPos {
		t.Fatalf("ParseToSP = %#v", sp)
	}

	withCursor := ParseToSP("hel[*]lo")
	if withCursor.Str != "hello" || withCursor.Pos != 3 {
		t.Fatalf("ParseToSP cursor = %#v", withCursor)
	}

	extended := withCursor.Append("!").Prepend("> ")
	if extended.Str != "> hello!" {
		t.Fatalf("StrWithPos append/prepend = %q", extended.Str)
	}
}

func TestHasBinaryDataAndIsBinaryContent(t *testing.T) {
	t.Parallel()

	if !HasBinaryData([]byte{0x00, 0x01}) {
		t.Fatal("HasBinaryData expected true for null byte")
	}
	if HasBinaryData([]byte("plain text")) {
		t.Fatal("HasBinaryData expected false for text")
	}
	if !IsBinaryContent([]byte{0xff, 0xfe}) {
		t.Fatal("IsBinaryContent expected true for high bytes")
	}
}
