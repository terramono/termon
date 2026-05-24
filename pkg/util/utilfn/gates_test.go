// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"testing"
	"time"
)

func TestEllipsisStrAndTruncateString(t *testing.T) {
	if got := EllipsisStr("hello world", 8); got != "hello..." {
		t.Fatalf("EllipsisStr = %q", got)
	}
	if got := TruncateString("hello world", 5); got != "he..." {
		t.Fatalf("TruncateString = %q", got)
	}
}

func TestLongestPrefixAndContainsStr(t *testing.T) {
	prefix := LongestPrefix("/tmp", []string{"/tmp/a", "/tmp/b/file"})
	if prefix != "/tmp/" {
		t.Fatalf("LongestPrefix = %q", prefix)
	}
	if !ContainsStr([]string{"a", "b"}, "b") {
		t.Fatal("ContainsStr expected true")
	}
	if IsPrefix([]string{"/tmp/file"}, "/tmp") != true {
		t.Fatal("IsPrefix expected true")
	}
}

func TestStrsEqualAndStrMapsEqual(t *testing.T) {
	if !StrsEqual([]string{"a", "b"}, []string{"a", "b"}) {
		t.Fatal("StrsEqual expected true")
	}
	m1 := map[string]string{"a": "1"}
	m2 := map[string]string{"a": "1"}
	if !StrMapsEqual(m1, m2) {
		t.Fatal("StrMapsEqual expected true")
	}
}

func TestEncodeDecodeStringMap(t *testing.T) {
	orig := map[string]string{"host": "localhost", "port": "8080"}
	encoded := EncodeStringMap(orig)
	decoded, err := DecodeStringMap(encoded)
	if err != nil {
		t.Fatalf("DecodeStringMap: %v", err)
	}
	if !StrMapsEqual(orig, decoded) {
		t.Fatalf("round trip mismatch: %#v vs %#v", orig, decoded)
	}
}

func TestEncodeDecodeStringArray(t *testing.T) {
	orig := []string{"alpha", "beta"}
	encoded := EncodeStringArray(orig)
	decoded, err := DecodeStringArray(encoded)
	if err != nil {
		t.Fatalf("DecodeStringArray: %v", err)
	}
	if !StrsEqual(orig, decoded) {
		t.Fatalf("round trip mismatch: %#v vs %#v", orig, decoded)
	}
	if !EncodedStringArrayHasFirstVal(encoded, "alpha") {
		t.Fatal("EncodedStringArrayHasFirstVal expected true")
	}
	if EncodedStringArrayGetFirstVal(encoded) != "alpha" {
		t.Fatalf("EncodedStringArrayGetFirstVal = %q", EncodedStringArrayGetFirstVal(encoded))
	}
}

func TestNullEncodeDecodeStr(t *testing.T) {
	encoded := NullEncodeStr("hello")
	decoded, err := NullDecodeStr(encoded)
	if err != nil {
		t.Fatalf("NullDecodeStr: %v", err)
	}
	if decoded != "hello" {
		t.Fatalf("NullDecodeStr = %q", decoded)
	}
}

func TestCombineAndSetHelpers(t *testing.T) {
	m1 := map[string]int{"a": 1}
	m2 := map[string]int{"b": 2}
	CombineMaps(m1, m2)
	if m1["b"] != 2 {
		t.Fatal("CombineMaps failed")
	}
	combined := CombineStrArrays([]string{"a"}, []string{"b", "a"})
	if !StrsEqual(combined, []string{"a", "b"}) {
		t.Fatalf("CombineStrArrays = %#v", combined)
	}
	intersection := StrSetIntersection([]string{"a", "b", "c"}, []string{"b", "d"})
	if !StrsEqual(intersection, []string{"b"}) {
		t.Fatalf("StrSetIntersection = %#v", intersection)
	}
}

func TestQuickJsonAndQuickParseJson(t *testing.T) {
	s := QuickJson(map[string]int{"x": 1})
	if s != `{"x":1}` {
		t.Fatalf("QuickJson = %s", s)
	}
	parsed := QuickParseJson[map[string]int](`{"y":2}`)
	if parsed["y"] != 2 {
		t.Fatalf("QuickParseJson = %#v", parsed)
	}
}

func TestSliceHelpers(t *testing.T) {
	arr := []string{"a", "b", "c"}
	if SliceIdx(arr, "b") != 1 {
		t.Fatalf("SliceIdx = %d", SliceIdx(arr, "b"))
	}
	arr = RemoveElemFromSlice(arr, "b")
	if !StrsEqual(arr, []string{"a", "c"}) {
		t.Fatalf("RemoveElemFromSlice = %#v", arr)
	}
	arr = AddElemToSliceUniq(arr, "c")
	if !StrsEqual(arr, []string{"a", "c"}) {
		t.Fatalf("AddElemToSliceUniq = %#v", arr)
	}
	arr = MoveSliceIdxToFront(arr, 1)
	if arr[0] != "c" {
		t.Fatalf("MoveSliceIdxToFront = %#v", arr)
	}
}

func TestStarMatchString(t *testing.T) {
	if !StarMatchString("*.go", "main.go", ".") {
		t.Fatal("StarMatchString expected true")
	}
	if StarMatchString("*.go", "main.ts", ".") {
		t.Fatal("StarMatchString expected false")
	}
}

func TestAtoiNoErrAndFindStringInSlice(t *testing.T) {
	if AtoiNoErr("42") != 42 {
		t.Fatal("AtoiNoErr failed")
	}
	if FindStringInSlice([]string{"x", "y"}, "y") != 1 {
		t.Fatalf("FindStringInSlice = %d", FindStringInSlice([]string{"x", "y"}, "y"))
	}
}

func TestGetFirstLineAndQuickHashString(t *testing.T) {
	if GetFirstLine("line1\nline2") != "line1" {
		t.Fatalf("GetFirstLine failed")
	}
	if QuickHashString("abc") == "" {
		t.Fatal("QuickHashString returned empty")
	}
}

func TestFormatRelativeTime(t *testing.T) {
	now := time.Now()
	if FormatRelativeTime(now.Add(-2 * time.Minute)) != "2 minutes ago" {
		t.Fatal("FormatRelativeTime minutes failed")
	}
	if FormatRelativeTime(now.Add(-30 * time.Second)) != "just now" {
		t.Fatal("FormatRelativeTime just now failed")
	}
}

func TestCompareHelpers(t *testing.T) {
	if !CompareAsMarshaledJson(map[string]int{"a": 1}, map[string]int{"a": 1}) {
		t.Fatal("CompareAsMarshaledJson expected true")
	}
	if !JsonValEqual(float64(1), int(1)) {
		t.Fatal("JsonValEqual numeric expected true")
	}
	if f, ok := ToFloat64(int(3)); !ok || f != 3 {
		t.Fatalf("ToFloat64 = %v, %v", f, ok)
	}
	if i, ok := ToInt64(float64(4)); !ok || i != 4 {
		t.Fatalf("ToInt64 = %v, %v", i, ok)
	}
	if i, ok := ToInt(int32(5)); !ok || i != 5 {
		t.Fatalf("ToInt = %v, %v", i, ok)
	}
	if s, ok := ToStr("hi"); !ok || s != "hi" {
		t.Fatalf("ToStr = %v, %v", s, ok)
	}
}

func TestParsePartialJson(t *testing.T) {
	val, err := ParsePartialJson([]byte(`{"a": 1, "b"`))
	if err != nil {
		t.Fatalf("ParsePartialJson: %v", err)
	}
	m, ok := val.(map[string]any)
	if !ok || m["a"] != float64(1) {
		t.Fatalf("ParsePartialJson = %#v", val)
	}
}

func TestAddInt(t *testing.T) {
	sum, err := AddInt(1, 2)
	if err != nil || sum != 3 {
		t.Fatalf("AddInt = %d, %v", sum, err)
	}
}

func TestGetOrderedMapKeys(t *testing.T) {
	keys := GetOrderedMapKeys(map[string]int{"b": 2, "a": 1})
	if !StrsEqual(keys, []string{"a", "b"}) {
		t.Fatalf("GetOrderedMapKeys = %#v", keys)
	}
}

func TestStrArrayToMap(t *testing.T) {
	m := StrArrayToMap([]string{"a", "b"})
	if !m["a"] || !m["b"] || m["c"] {
		t.Fatalf("StrArrayToMap = %#v", m)
	}
}

func TestSortStringRunes(t *testing.T) {
	if SortStringRunes("cba") != "abc" {
		t.Fatalf("SortStringRunes failed")
	}
}

func TestMergeStrMaps(t *testing.T) {
	merged := MergeStrMaps(map[string]int{"a": 1}, map[string]int{"b": 2})
	if merged["a"] != 1 || merged["b"] != 2 {
		t.Fatalf("MergeStrMaps = %#v", merged)
	}
}
