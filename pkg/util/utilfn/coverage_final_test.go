// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"math"
	"testing"
	"time"
)

func TestShellQuoteBranches(t *testing.T) {
	if got := ShellQuote("hello", false, -1); got != "hello" {
		t.Fatalf("ShellQuote plain = %q", got)
	}
	if got := ShellQuote("hello world", false, -1); got[0] != '\'' {
		t.Fatalf("ShellQuote spaced = %q", got)
	}
	if got := ShellQuote("hello", true, -1); got != `"hello"` {
		t.Fatalf("ShellQuote forced = %q", got)
	}
	if got := ShellQuote("it's", false, -1); got == "" {
		t.Fatal("ShellQuote apostrophe expected quoted")
	}
	if got := ShellQuote(`"long quoted value"`, false, 10); !containsStr(got, "...") {
		t.Fatalf("ShellQuote quoted truncate = %q", got)
	}
	if got := ShellQuote("longvalue", false, 8); got != "longv..." {
		t.Fatalf("ShellQuote truncate = %q", got)
	}
}

func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexStr(s, sub) >= 0)
}

func indexStr(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func TestJsonMapStructRoundTripErrors(t *testing.T) {
	type out struct {
		Name string `json:"name"`
	}
	var o out
	if err := JsonMapToStruct(map[string]any{"name": "x"}, &o); err != nil || o.Name != "x" {
		t.Fatalf("JsonMapToStruct = %+v, %v", o, err)
	}
	if err := JsonMapToStruct(map[string]any{"bad": make(chan int)}, &o); err == nil {
		t.Fatal("JsonMapToStruct marshal fail expected error")
	}
	type bad struct {
		Ch chan int `json:"ch"`
	}
	if _, err := StructToJsonMap(bad{Ch: make(chan int)}); err == nil {
		t.Fatal("StructToJsonMap marshal fail expected error")
	}
}

func TestCompareHelpersAllBranches(t *testing.T) {
	if !CompareAsMarshaledJson(map[string]int{"a": 1}, map[string]int{"a": 1}) {
		t.Fatal("CompareAsMarshaledJson equal maps expected true")
	}
	if CompareAsMarshaledJson(make(chan int), map[string]int{}) {
		t.Fatal("CompareAsMarshaledJson marshal fail expected false")
	}
	if !JsonValEqual(int(1), int64(1)) {
		t.Fatal("JsonValEqual numeric expected true")
	}
	if JsonValEqual([]int{1}, []int{1}) {
		t.Fatal("JsonValEqual different slice pointers expected false")
	}
	if f, ok := ToFloat64(int32(2)); !ok || f != 2 {
		t.Fatalf("ToFloat64 int32 = %v, %v", f, ok)
	}
	if _, ok := ToFloat64("bad"); ok {
		t.Fatal("ToFloat64 string expected false")
	}
	if n, ok := ToInt64(uint16(3)); !ok || n != 3 {
		t.Fatalf("ToInt64 uint16 = %d, %v", n, ok)
	}
	if _, ok := ToInt64("bad"); ok {
		t.Fatal("ToInt64 string expected false")
	}
	if s, ok := ToStr(nil); ok || s != "" {
		t.Fatalf("ToStr nil = %q, %v", s, ok)
	}
	if s, ok := ToStr("hi"); !ok || s != "hi" {
		t.Fatalf("ToStr string = %q, %v", s, ok)
	}
	if _, ok := ToStr(42); ok {
		t.Fatal("ToStr int expected false")
	}
}

func TestJsonStackPopEmpty(t *testing.T) {
	var s jsonStack
	if s.pop() != stackInvalid {
		t.Fatal("pop empty expected stackInvalid")
	}
}

func TestGetStrArrAndGetBoolBranches(t *testing.T) {
	m := map[string]any{"arr": []any{"a", 1, "b"}, "flag": false}
	arr := GetStrArr(m, "arr")
	if len(arr) != 2 || arr[0] != "a" || arr[1] != "b" {
		t.Fatalf("GetStrArr = %#v", arr)
	}
	if GetBool(m, "flag") {
		t.Fatal("GetBool false expected false")
	}
	if GetBool(m, "missing") {
		t.Fatal("GetBool missing expected false")
	}
}

func TestStrHelpersBranches(t *testing.T) {
	if StrsEqual([]string{"a"}, []string{"b"}) {
		t.Fatal("StrsEqual different expected false")
	}
	if StrMapsEqual(map[string]string{"a": "1"}, map[string]string{"a": "2"}) {
		t.Fatal("StrMapsEqual different values expected false")
	}
	if ByteMapsEqual(map[string][]byte{"a": {1}}, map[string][]byte{"a": {1}, "b": {2}}) {
		t.Fatal("ByteMapsEqual different keys expected false")
	}
	if _, err := AddIntSlice(1, 2, math.MaxInt); err == nil {
		t.Fatal("AddIntSlice overflow expected error")
	}
	if got := RemoveElemFromSlice([]string{"a", "b"}, "missing"); len(got) != 2 {
		t.Fatalf("RemoveElemFromSlice missing = %#v", got)
	}
	if got := MoveSliceIdxToFront([]string{"a", "b", "c"}, 5); len(got) != 3 {
		t.Fatalf("MoveSliceIdxToFront oob = %#v", got)
	}
}

func TestWriteFileIfDifferentAndRandomHex(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/file.txt"
	changed, err := WriteFileIfDifferent(path, []byte("one"))
	if err != nil || !changed {
		t.Fatalf("WriteFileIfDifferent new = %v, %v", changed, err)
	}
	changed, err = WriteFileIfDifferent(path, []byte("one"))
	if err != nil || changed {
		t.Fatalf("WriteFileIfDifferent same = %v, %v", changed, err)
	}
	if _, err := RandomHexString(0); err != nil {
		t.Fatalf("RandomHexString 0: %v", err)
	}
}

func TestFormatRelativeTimeFuture(t *testing.T) {
	future := time.Now().Add(48 * time.Hour)
	got := FormatRelativeTime(future)
	if got == "" {
		t.Fatal("FormatRelativeTime future expected non-empty")
	}
}

func TestParsePartialJsonEdge(t *testing.T) {
	got, err := ParsePartialJson([]byte(`{"a":1`))
	if err != nil || got == nil {
		t.Fatalf("ParsePartialJson = %#v, %v", got, err)
	}
}
