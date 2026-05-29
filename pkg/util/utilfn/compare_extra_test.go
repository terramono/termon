// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import "testing"

func TestCompareHelpersTable(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		fn   func() bool
		want bool
	}{
		{"both nil json", func() bool { return CompareAsMarshaledJson(nil, nil) }, true},
		{"one nil json", func() bool { return CompareAsMarshaledJson(nil, map[string]int{"a": 1}) }, false},
		{"json mismatch", func() bool { return CompareAsMarshaledJson(map[string]int{"a": 1}, map[string]int{"a": 2}) }, false},
		{"json equal", func() bool { return CompareAsMarshaledJson([]int{1, 2}, []int{1, 2}) }, true},
		{"json val both nil", func() bool { return JsonValEqual(nil, nil) }, true},
		{"json val one nil", func() bool { return JsonValEqual(nil, 1) }, false},
		{"json val string equal", func() bool { return JsonValEqual("x", "x") }, true},
		{"json val string mismatch", func() bool { return JsonValEqual("x", "y") }, false},
		{"json val numeric mismatch", func() bool { return JsonValEqual(int(1), int(2)) }, false},
		{"json val type mismatch", func() bool { return JsonValEqual("1", 1) }, false},
		{"is numeric int", func() bool { return IsNumericType(int(1)) }, true},
		{"is numeric string", func() bool { return IsNumericType("1") }, false},
		{"compare float64 mismatch", func() bool { return CompareAsFloat64(int(1), int(2)) }, false},
		{"to float64 bad type", func() bool { _, ok := ToFloat64("n"); return !ok }, true},
		{"to int64 bad type", func() bool { _, ok := ToInt64("n"); return !ok }, true},
		{"to int bad type", func() bool { _, ok := ToInt("n"); return !ok }, true},
		{"to str bad type", func() bool { _, ok := ToStr(1); return !ok }, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.fn(); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestJsonValEqualSlicePointer(t *testing.T) {
	t.Parallel()

	s1 := []int{1, 2}
	s2 := []int{1, 2}
	if JsonValEqual(s1, s1) != true {
		t.Fatal("same slice pointer expected true")
	}
	if JsonValEqual(s1, s2) != false {
		t.Fatal("different slice pointers expected false")
	}
}
