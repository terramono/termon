// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import (
	"testing"
)

func TestQuickSetNullableInt64Paths(t *testing.T) {
	var ni *int64
	QuickSetNullableInt64(&ni, map[string]any{}, "missing")
	if ni != nil {
		t.Fatal("QuickSetNullableInt64 missing expected nil")
	}

	QuickSetNullableInt64(&ni, map[string]any{"n": int64(7)}, "n")
	if ni == nil || *ni != 7 {
		t.Fatalf("QuickSetNullableInt64 int64 = %v", ni)
	}

	QuickSetNullableInt64(&ni, map[string]any{"n": int(9)}, "n")
	if ni == nil || *ni != 9 {
		t.Fatalf("QuickSetNullableInt64 int = %v", ni)
	}
}

func TestQuickSetBytesAndGetByteArr(t *testing.T) {
	var barr []byte
	QuickSetBytes(&barr, map[string]any{}, "missing")
	if barr != nil {
		t.Fatalf("QuickSetBytes missing = %q", barr)
	}
	QuickSetBytes(&barr, map[string]any{"n": []byte("raw")}, "n")
	if string(barr) != "raw" {
		t.Fatalf("QuickSetBytes = %q", barr)
	}

	got, ok := getByteArr(map[string]any{"n": "strval"}, "n", "def")
	if !ok || string(got) != "strval" {
		t.Fatalf("getByteArr string = %q, %v", got, ok)
	}
	if _, ok := getByteArr(map[string]any{"n": 42}, "n", "def"); ok {
		t.Fatal("getByteArr bad type expected false")
	}
}

type intFieldRow struct {
	N int `dbmap:"n"`
}

func (intFieldRow) UseDBMap() {}

func TestFromDBMapIntField(t *testing.T) {
	row := &intFieldRow{}
	FromDBMap(row, map[string]any{"n": int64(4)})
	if row.N != 4 {
		t.Fatalf("FromDBMap int field = %d", row.N)
	}
}

func TestParseJsonArrEmpty(t *testing.T) {
	if got := ParseJsonArr[string](""); got != nil {
		t.Fatalf("ParseJsonArr empty = %#v", got)
	}
}

func TestToDBMapNil(t *testing.T) {
	var row *testDBRow
	if got := ToDBMap(row, false); got != nil {
		t.Fatalf("ToDBMap nil = %#v", got)
	}
}

func TestFromDBMapNonStructValue(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("FromDBMap non-struct expected panic")
		}
	}()
	FromDBMap(stringMapper("x"), map[string]any{"name": "ok"})
}

type unsupportedFieldRow struct {
	Fn func() `dbmap:"fn"`
}

func (unsupportedFieldRow) UseDBMap() {}

func TestFromDBMapUnsupportedFieldPanic(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("FromDBMap unsupported field expected panic")
		}
	}()
	row := &unsupportedFieldRow{}
	FromDBMap(row, map[string]any{"fn": "x"})
}
