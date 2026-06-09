// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"io"
	"math"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestCompareAndMarshalFullBranches(t *testing.T) {
	t.Parallel()

	if CompareAsMarshaledJson(make(chan int), map[string]int{}) {
		t.Fatal("CompareAsMarshaledJson marshal fail expected false")
	}
	if JsonValEqual(map[string]int{"a": 1}, map[string]int{"a": 1}) {
		t.Fatal("JsonValEqual different map pointers expected false")
	}
	if _, ok := ToFloat64(nil); ok {
		t.Fatal("ToFloat64 nil expected false")
	}
	if _, ok := ToInt64(nil); ok {
		t.Fatal("ToInt64 nil expected false")
	}

	type sample struct {
		Count int `json:"count"`
	}
	var s sample
	if err := MapToStruct(map[string]any{"count": 2}, &s); err != nil || s.Count != 2 {
		t.Fatalf("MapToStruct = %+v, %v", s, err)
	}
	m, err := StructToMap(sample{Count: 3})
	if err != nil || m["count"] != 3 {
		t.Fatalf("StructToMap = %#v, %v", m, err)
	}

	if err := DoMapStructure(&s, map[string]any{"count": 4}); err != nil || s.Count != 4 {
		t.Fatalf("DoMapStructure = %+v, %v", s, err)
	}

	if err := setValue(reflect.ValueOf(&s).Elem().FieldByName("Count"), float64(5)); err != nil {
		t.Fatalf("setValue convert: %v", err)
	}

	if got := MarshalJSONString("hi"); got != `"hi"` {
		t.Fatalf("MarshalJSONString = %s", got)
	}
	if ContainsBinaryData([]byte("text")) {
		t.Fatal("ContainsBinaryData text expected false")
	}
}

func TestUtilFnStringHelpersFull(t *testing.T) {
	t.Parallel()

	if EllipsisStr("abc", 10) != "abc" {
		t.Fatal("EllipsisStr short failed")
	}
	if TruncateString("abc", 10) != "abc" {
		t.Fatal("TruncateString short failed")
	}
	if LongestPrefix("/tmp", nil) != "/tmp" {
		t.Fatal("LongestPrefix nil failed")
	}
	if ContainsStr(nil, "x") {
		t.Fatal("ContainsStr nil should be false")
	}
	if IsPrefix(nil, "x") {
		t.Fatal("IsPrefix nil expected false")
	}
	if _, err := AddInt(math.MinInt, -1); err == nil {
		t.Fatal("AddInt underflow expected error")
	}
	if StrsEqual([]string{"a"}, []string{"a", "b"}) {
		t.Fatal("StrsEqual different lengths expected false")
	}
	if StrMapsEqual(map[string]string{"a": "1"}, map[string]string{"a": "2"}) {
		t.Fatal("StrMapsEqual different values expected false")
	}
	if EncodedStringArrayHasFirstVal([]byte("bad"), "x") {
		t.Fatal("EncodedStringArrayHasFirstVal bad expected false")
	}
	if EncodedStringArrayGetFirstVal(EncodeStringArray([]string{"first", "second"})) != "first" {
		t.Fatal("EncodedStringArrayGetFirstVal expected first value")
	}
	if len(NullEncodeStr(string([]byte{0}))) == 0 {
		t.Fatal("NullEncodeStr escaped expected non-empty")
	}
	if AddElemToSliceUniq([]string{"a"}, "b")[1] != "b" {
		t.Fatal("AddElemToSliceUniq append failed")
	}
	if !StarMatchString("a.**", "a.b.c", ".") {
		t.Fatal("StarMatchString ** expected true")
	}
	if arch, err := FilterValidArch("x86_64"); err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch x86_64 = %q, %v", arch, err)
	}
	if arch, err := FilterValidArch("arm64"); err != nil || arch != "arm64" {
		t.Fatalf("FilterValidArch arm64 = %q, %v", arch, err)
	}
}

func TestStreamToLinesLongLine(t *testing.T) {
	t.Parallel()

	long := strings.Repeat("x", maxLineLength+10) + "\n"
	var got []string
	err := StreamToLines(strings.NewReader(long), func(line []byte) {
		got = append(got, string(line))
	}, nil)
	if err != io.EOF {
		t.Fatalf("StreamToLines long line err = %v", err)
	}
}

func TestPartialJsonPopRepair(t *testing.T) {
	t.Parallel()

	val, err := ParsePartialJson([]byte(`"hello`))
	if err != nil {
		t.Fatalf("ParsePartialJson string: %v", err)
	}
	if val == nil {
		t.Fatal("ParsePartialJson string expected value")
	}
}

func TestDrainChannelSafeTimeout(t *testing.T) {
	ch := make(chan int)
	go func() {
		time.Sleep(20 * time.Millisecond)
		close(ch)
	}()
	DrainChannelSafe(ch, "timeout-test")
}

func TestGetCmdExitCodeSignaled(t *testing.T) {
	cmd := exec.Command("sh", "-c", "kill -TERM $$")
	cmdErr := cmd.Run()
	if cmdErr == nil {
		t.Skip("signal exit test unavailable")
	}
	_ = GetCmdExitCode(cmd, cmdErr)
}

func TestJsonHelpersRoundTrip(t *testing.T) {
	type sample struct {
		Name string `json:"name"`
	}
	var s sample
	if err := JsonMapToStruct(map[string]any{"name": "x"}, &s); err != nil || s.Name != "x" {
		t.Fatalf("JsonMapToStruct = %+v, %v", s, err)
	}
	m, err := StructToJsonMap(sample{Name: "y"})
	if err != nil || m["name"] != "y" {
		t.Fatalf("StructToJsonMap = %#v, %v", m, err)
	}
}

func TestFormatRelativeTimeSingular(t *testing.T) {
	now := time.Now()
	if FormatRelativeTime(now.Add(-1*time.Hour)) != "1 hour ago" {
		t.Fatal("FormatRelativeTime hour singular failed")
	}
	if FormatRelativeTime(now.Add(-24*time.Hour)) != "1 day ago" {
		t.Fatal("FormatRelativeTime day singular failed")
	}
	if FormatRelativeTime(now.Add(-30*24*time.Hour)) != "1 month ago" {
		t.Fatal("FormatRelativeTime month singular failed")
	}
}

func TestAtomicRenameCopyFailure(t *testing.T) {
	err := AtomicRenameCopy(filepath.Join(t.TempDir(), "dst"), "/missing/src", 0644)
	if err == nil {
		t.Fatal("AtomicRenameCopy missing src expected error")
	}
}
