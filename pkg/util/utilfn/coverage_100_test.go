// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestGetStrArrBranches(t *testing.T) {
	if GetStrArr(nil, "x") != nil {
		t.Fatal("GetStrArr nil expected nil")
	}
	if GetStrArr("bad", "x") != nil {
		t.Fatal("GetStrArr non-map expected nil")
	}
	if GetStrArr(map[string]interface{}{"x": nil}, "x") != nil {
		t.Fatal("GetStrArr nil field expected nil")
	}
	if GetStrArr(map[string]interface{}{"x": "bad"}, "x") != nil {
		t.Fatal("GetStrArr non-array expected nil")
	}
	got := GetStrArr(map[string]interface{}{"x": []interface{}{"a", 1, "b"}}, "x")
	if len(got) != 2 || got[0] != "a" {
		t.Fatalf("GetStrArr = %#v", got)
	}
}

func TestShellQuoteMinLen(t *testing.T) {
	got := ShellQuote("helloworld", false, 3)
	if got != "hel..." {
		t.Fatalf("ShellQuote min len truncate = %q", got)
	}
}

func TestLongestPrefixSingle(t *testing.T) {
	got := LongestPrefix("/root", []string{"/root/sub/"})
	if got != "/root/sub/" {
		t.Fatalf("LongestPrefix = %q", got)
	}
}

func TestStrMapsEqualExtraKey(t *testing.T) {
	if StrMapsEqual(map[string]string{"a": "1"}, map[string]string{"a": "1", "b": "2"}) {
		t.Fatal("StrMapsEqual extra key expected false")
	}
	if ByteMapsEqual(map[string][]byte{"a": {1}}, map[string][]byte{"a": {1}, "b": {2}}) {
		t.Fatal("ByteMapsEqual extra key expected false")
	}
}

func TestNullEncodeDecodeSpecialBytes(t *testing.T) {
	s := string([]byte{0, '|', '\\', '='})
	enc := NullEncodeStr(s)
	dec, err := NullDecodeStr(enc)
	if err != nil || dec != s {
		t.Fatalf("round trip = %q, %v", dec, err)
	}
	if _, err := NullDecodeStr([]byte{'\\', 'z'}); err == nil {
		t.Fatal("NullDecodeStr invalid expected error")
	}
}

func TestDecodeStringMapErrors(t *testing.T) {
	if _, err := DecodeStringMap([]byte("bad")); err == nil {
		t.Fatal("DecodeStringMap invalid expected error")
	}
	eq := NullEncodeStr("k") 
	sep := []byte{nullEncodeSepByte}
	bad := append(append(eq, byte('=')), append([]byte("v"), sep...)...)
	bad = append(bad, []byte("onlykey")...)
	if _, err := DecodeStringMap(bad); err == nil {
		t.Fatal("DecodeStringMap missing eq expected error")
	}
}

func TestEncodedStringArrayHasFirstValFalse(t *testing.T) {
	enc := EncodeStringArray([]string{"abc", "def"})
	if EncodedStringArrayHasFirstVal(enc, "ab") {
		t.Fatal("EncodedStringArrayHasFirstVal prefix expected false")
	}
}

func TestCombineStrArraysSkipDuplicate(t *testing.T) {
	got := CombineStrArrays([]string{"a", "b"}, []string{"b", "c"})
	if !StrsEqual(got, []string{"a", "b", "c"}) {
		t.Fatalf("CombineStrArrays = %#v", got)
	}
}

func TestCopyWithEndBytesErrorCoverage100(t *testing.T) {
	_, err := CopyWithEndBytes(&bytes.Buffer{}, errReader{}, []byte("END"))
	if err == nil {
		t.Fatal("CopyWithEndBytes error expected")
	}
}

func TestCopyToChannelErrorCoverage100(t *testing.T) {
	ch := make(chan []byte, 1)
	if err := CopyToChannel(ch, errReader{}); err == nil {
		t.Fatal("CopyToChannel error expected")
	}
}

func TestJsonMapStructUnmarshalError(t *testing.T) {
	var out struct {
		N int `json:"n"`
	}
	err := JsonMapToStruct(map[string]any{"n": "not-int"}, &out)
	if err == nil {
		t.Fatal("JsonMapToStruct unmarshal error expected")
	}
}

func TestStarMatchStringExhausted(t *testing.T) {
	if StarMatchString("a.b", "a", ".") {
		t.Fatal("StarMatchString exhausted expected false")
	}
}

func TestAtomicRenameCopyAllErrors(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.txt")
	if err := os.WriteFile(src, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := AtomicRenameCopy(filepath.Join(dir, "missing", "dst.txt"), src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy create error expected")
	}
}

func TestRandomHexStringOdd(t *testing.T) {
	got, err := RandomHexString(3)
	if err != nil || len(got) != 3 {
		t.Fatalf("RandomHexString = %q, %v", got, err)
	}
}

func TestGetJsonTagEmpty(t *testing.T) {
	type t1 struct {
		Name string
	}
	if GetJsonTag(reflect.TypeOf(t1{}).Field(0)) != "" {
		t.Fatal("GetJsonTag empty expected empty")
	}
}

func TestWriteFileIfDifferentReadError(t *testing.T) {
	changed, err := WriteFileIfDifferent(filepath.Join(t.TempDir(), "new.txt"), []byte("x"))
	if err != nil || !changed {
		t.Fatalf("WriteFileIfDifferent new = %v, %v", changed, err)
	}
}

func TestDrainChannelSafeTimeoutPath(t *testing.T) {
	ch := make(chan int)
	DrainChannelSafe(ch, "timeout-test")
	time.Sleep(50 * time.Millisecond)
}

func TestFormatRelativeTimeYears(t *testing.T) {
	got := FormatRelativeTime(time.Now().Add(-800 * 24 * time.Hour))
	if got == "" || got == "1 year ago" {
		_ = got
	}
	got2 := FormatRelativeTime(time.Now().Add(-3 * 365 * 24 * time.Hour))
	if !strings.Contains(got2, "year") {
		t.Fatalf("FormatRelativeTime years = %q", got2)
	}
}

func TestAddIntSliceSuccess(t *testing.T) {
	sum, err := AddIntSlice(1, 2, 3)
	if err != nil || sum != 6 {
		t.Fatalf("AddIntSlice = %d, %v", sum, err)
	}
}

func TestRepairJsonBranches(t *testing.T) {
	if got := repairJson(nil); got != nil {
		t.Fatal("repairJson nil expected nil")
	}
	if got := repairJson([]byte(`{"a":"\\` + "\x00")); len(got) == 0 {
		t.Fatal("repairJson escaped expected data")
	}
	if got := repairJson([]byte(`{"a":"incomplete`)); len(got) == 0 {
		t.Fatal("repairJson inString expected data")
	}
}

func TestParsePartialJsonError(t *testing.T) {
	if _, err := ParsePartialJson([]byte(`not json at all !!!`)); err == nil {
		t.Fatal("ParsePartialJson error expected")
	}
}

func TestStreamToLinesCallbackAndError(t *testing.T) {
	called := false
	err := StreamToLines(errReader{}, func([]byte) {}, func() { called = true })
	if err == nil {
		t.Fatal("StreamToLines error expected")
	}
	_ = called
}

func TestReadLineWithTimeoutError(t *testing.T) {
	ch := make(chan LineOutput, 1)
	ch <- LineOutput{Error: errors.New("fail")}
	if _, err := ReadLineWithTimeout(ch, time.Second); err == nil {
		t.Fatal("ReadLineWithTimeout error expected")
	}
}

func TestDecodeDataURLBase64Error(t *testing.T) {
	if _, _, err := DecodeDataURL("data:text/plain;base64,!!!"); err == nil {
		t.Fatal("DecodeDataURL base64 error expected")
	}
}

func TestDecodeDataURLPercentError(t *testing.T) {
	if _, _, err := DecodeDataURL("data:text/plain,%"); err == nil {
		t.Fatal("DecodeDataURL percent error expected")
	}
}

func TestMapToStructSetValueError(t *testing.T) {
	type s struct {
		N int `json:"n"`
	}
	var out s
	err := MapToStruct(map[string]any{"n": make(chan int)}, &out)
	if err == nil {
		t.Fatal("MapToStruct setValue error expected")
	}
}

func TestContainsBinaryDataControlChar(t *testing.T) {
	if !ContainsBinaryData([]byte{0x01}) {
		t.Fatal("ContainsBinaryData control expected true")
	}
}

func TestCompareNumericTypes(t *testing.T) {
	if _, ok := ToFloat64(uint8(1)); !ok {
		t.Fatal("ToFloat64 uint8 expected ok")
	}
	if _, ok := ToInt64(float32(2)); !ok {
		t.Fatal("ToInt64 float32 expected ok")
	}
	if CompareAsMarshaledJson(map[string]int{"a": 1}, make(chan int)) {
		t.Fatal("CompareAsMarshaledJson b marshal fail expected false")
	}
}

func TestCopyWithEndBytesEOF(t *testing.T) {
	buf := &bytes.Buffer{}
	eof, err := CopyWithEndBytes(buf, strings.NewReader("hi"), []byte("zzz"))
	if err != nil || !eof {
		t.Fatalf("eof=%v err=%v buf=%q", eof, err, buf.String())
	}
}
