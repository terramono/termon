// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestGetStrArr(t *testing.T) {
	t.Parallel()

	if got := GetStrArr(nil, "items"); got != nil {
		t.Fatalf("GetStrArr nil = %#v", got)
	}
	if got := GetStrArr(map[string]any{"items": []any{"a", "b"}}, "items"); !StrsEqual(got, []string{"a", "b"}) {
		t.Fatalf("GetStrArr = %#v", got)
	}
	if got := GetStrArr(map[string]any{"items": "bad"}, "items"); got != nil {
		t.Fatalf("GetStrArr bad type = %#v", got)
	}
}

func TestSha1HashAndGetMapKeys(t *testing.T) {
	t.Parallel()

	hash := Sha1Hash([]byte("hello"))
	if hash == "" {
		t.Fatal("Sha1Hash returned empty")
	}

	keys := GetMapKeys(map[string]int{"b": 2, "a": 1})
	if len(keys) != 2 {
		t.Fatalf("GetMapKeys = %#v", keys)
	}
}

func TestShellHexEscapeAndIndentString(t *testing.T) {
	t.Parallel()

	if got := ShellHexEscape("\x00A"); got != "\\x00\\x41" {
		t.Fatalf("ShellHexEscape = %q", got)
	}
	if got := IndentString("  ", "line"); got != "  line\n" {
		t.Fatalf("IndentString = %q", got)
	}
}

func TestGetLineColFromOffset(t *testing.T) {
	t.Parallel()

	line, col := GetLineColFromOffset([]byte("ab\ncd"), 4)
	if line != 2 || col != 2 {
		t.Fatalf("GetLineColFromOffset = %d,%d", line, col)
	}
}

func TestFormatLsTime(t *testing.T) {
	t.Parallel()

	recent := FormatLsTime(time.Now().Add(-24 * time.Hour))
	if !strings.Contains(recent, ":") {
		t.Fatalf("FormatLsTime recent = %q", recent)
	}
	old := FormatLsTime(time.Now().AddDate(-1, 0, 0))
	if !strings.Contains(old, "20") {
		t.Fatalf("FormatLsTime old = %q", old)
	}
}

func TestGetJsonTag(t *testing.T) {
	t.Parallel()

	field, ok := reflect.TypeOf(marshalTestStruct{}).FieldByName("Name")
	if !ok {
		t.Fatal("field not found")
	}
	tag := GetJsonTag(field)
	if tag != "name" {
		t.Fatalf("GetJsonTag = %q", tag)
	}
}

func TestFilterValidArch(t *testing.T) {
	t.Parallel()

	arch, err := FilterValidArch("amd64")
	if err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch amd64 = %q, %v", arch, err)
	}
	if _, err := FilterValidArch("invalid"); err == nil {
		t.Fatal("FilterValidArch invalid expected error")
	}
}

func TestAddIntSliceOverflow(t *testing.T) {
	t.Parallel()

	_, err := AddIntSlice(1<<62, 1<<62)
	if err != ErrOverflow {
		t.Fatalf("AddIntSlice overflow = %v", err)
	}
}

func TestNullEncodeDecodeStrSpecialChars(t *testing.T) {
	t.Parallel()

	encoded := NullEncodeStr("a|b")
	if len(encoded) == 0 {
		t.Fatal("NullEncodeStr special expected encoded bytes")
	}
	decoded, err := NullDecodeStr(encoded)
	if err != nil || decoded != "a|b" {
		t.Fatalf("NullDecodeStr special = %q, %v", decoded, err)
	}
}

func TestRandomHexStringAndAtoiNoErr(t *testing.T) {
	t.Parallel()

	hexStr, err := RandomHexString(8)
	if err != nil || len(hexStr) != 8 {
		t.Fatalf("RandomHexString = %q, %v", hexStr, err)
	}
	if AtoiNoErr("not-a-number") != 0 {
		t.Fatal("AtoiNoErr bad input expected 0")
	}
}
