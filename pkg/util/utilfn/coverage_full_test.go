// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"bytes"
	"context"
	"errors"
	"io"
	"math"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"testing"
	"time"
)

type stringerKey string

func (s stringerKey) String() string { return string(s) }

func TestStrWithPosAndChunkSlice(t *testing.T) {
	t.Parallel()

	sp := ParseToSP("hel[*]lo")
	if sp.String() != "hel[*]lo" {
		t.Fatalf("String() = %q", sp.String())
	}
	if got := strWithCursor("abc", NoStrPos); got != "abc" {
		t.Fatalf("strWithCursor NoStrPos = %q", got)
	}
	if got := strWithCursor("abc", -2); got != "[*]_abc" {
		t.Fatalf("strWithCursor negative = %q", got)
	}
	if got := strWithCursor("ab", 10); got != "ab_[*]" {
		t.Fatalf("strWithCursor past end = %q", got)
	}
	if got := strWithCursor("ab", 2); got != "ab[*]" {
		t.Fatalf("strWithCursor at end = %q", got)
	}
	if got := strWithCursor("abc", 1); got != "a[*]bc" {
		t.Fatalf("strWithCursor middle = %q", got)
	}

	chunks := ChunkSlice([]int{1, 2, 3, 4, 5}, 2)
	if len(chunks) != 3 || len(chunks[0]) != 2 || chunks[2][0] != 5 {
		t.Fatalf("ChunkSlice = %#v", chunks)
	}
}

func TestGetOrderedStringerMapKeys(t *testing.T) {
	t.Parallel()

	keys := GetOrderedStringerMapKeys(map[stringerKey]int{
		"b": 2,
		"a": 1,
	})
	if keys[0] != "a" || keys[1] != "b" {
		t.Fatalf("GetOrderedStringerMapKeys = %#v", keys)
	}
}

func TestAppendCopyChannelExitHelpers(t *testing.T) {
	t.Parallel()

	b := AppendNonZeroRandomBytes([]byte("x"), 3)
	if len(b) != 4 {
		t.Fatalf("AppendNonZeroRandomBytes len = %d", len(b))
	}
	if len(AppendNonZeroRandomBytes(nil, 0)) != 0 {
		t.Fatal("AppendNonZeroRandomBytes zero len expected unchanged")
	}

	buf := &bytes.Buffer{}
	eof, err := CopyWithEndBytes(buf, strings.NewReader("helloEND"), []byte("END"))
	if err != nil || buf.String() != "hello" {
		t.Fatalf("CopyWithEndBytes = %q, eof=%v, err=%v", buf.String(), eof, err)
	}
	_, err = CopyWithEndBytes(&bytes.Buffer{}, errReader{}, []byte("END"))
	if err == nil {
		t.Fatal("CopyWithEndBytes read error expected")
	}

	ch := make(chan []byte, 2)
	if err := CopyToChannel(ch, strings.NewReader("ab")); err != nil {
		t.Fatalf("CopyToChannel: %v", err)
	}
	<-ch
	if err := CopyToChannel(ch, errReader{}); err == nil {
		t.Fatal("CopyToChannel read error expected")
	}

	cmd := exec.Command("sh", "-c", "exit 7")
	cmdErr := cmd.Run()
	if code := GetCmdExitCode(cmd, cmdErr); code != 7 {
		t.Fatalf("GetCmdExitCode = %d", code)
	}
	if code := GetCmdExitCode(nil, errors.New("fail")); code != -1 {
		t.Fatalf("GetCmdExitCode nil cmd = %d", code)
	}
	if code := GetExitCode(nil); code != 0 {
		t.Fatalf("GetExitCode nil = %d", code)
	}
	exitCmd := exec.Command("sh", "-c", "exit 3")
	exitErr := exitCmd.Run()
	if code := GetExitCode(exitErr); code != 3 {
		t.Fatalf("GetExitCode = %d", code)
	}
}

type errReader struct{}

func (errReader) Read([]byte) (int, error) { return 0, errors.New("read fail") }

func TestJsonMapStructHelpers(t *testing.T) {
	t.Parallel()

	type person struct {
		Name string `json:"name"`
	}
	var p person
	if err := JsonMapToStruct(map[string]any{"name": "alice"}, &p); err != nil || p.Name != "alice" {
		t.Fatalf("JsonMapToStruct = %+v, %v", p, err)
	}
	m, err := StructToJsonMap(person{Name: "bob"})
	if err != nil || m["name"] != "bob" {
		t.Fatalf("StructToJsonMap = %#v, %v", m, err)
	}
}

func TestFileHelpers(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	src := dir + "/src.txt"
	dst := dir + "/dst.txt"
	if err := os.WriteFile(src, []byte("copy-me"), 0644); err != nil {
		t.Fatalf("WriteFile src: %v", err)
	}
	if err := AtomicRenameCopy(dst, src, 0644); err != nil {
		t.Fatalf("AtomicRenameCopy: %v", err)
	}
	data, _ := os.ReadFile(dst)
	if string(data) != "copy-me" {
		t.Fatalf("AtomicRenameCopy dst = %q", data)
	}

	out := dir + "/template.txt"
	if err := WriteTemplateToFile(out, "hello {{.Name}}", map[string]string{"Name": "world"}); err != nil {
		t.Fatalf("WriteTemplateToFile: %v", err)
	}
	existing, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	changed, err := WriteFileIfDifferent(out, existing)
	if err != nil || changed {
		t.Fatalf("WriteFileIfDifferent same = %v, %v", changed, err)
	}
	changed, err = WriteFileIfDifferent(out, []byte("new\n"))
	if err != nil || !changed {
		t.Fatalf("WriteFileIfDifferent diff = %v, %v", changed, err)
	}
}

func TestUUIDAndContextHelpers(t *testing.T) {
	t.Parallel()

	v7, err := ConvertUUIDv4Tov7("550e8400-e29b-41d4-a716-446655440000")
	if err != nil || !strings.HasPrefix(v7, "01823a80-0000-7") {
		t.Fatalf("ConvertUUIDv4Tov7 = %q, %v", v7, err)
	}
	if _, err := ConvertUUIDv4Tov7("bad"); err == nil {
		t.Fatal("ConvertUUIDv4Tov7 bad expected error")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if got := TimeoutFromContext(ctx, time.Minute); got >= time.Minute {
		t.Fatalf("TimeoutFromContext with deadline = %v", got)
	}
	if got := TimeoutFromContext(context.Background(), time.Minute); got != time.Minute {
		t.Fatalf("TimeoutFromContext no deadline = %v", got)
	}
}

func TestDumpStacksAndWallClock(t *testing.T) {
	t.Parallel()

	var buf bytes.Buffer
	DumpGoRoutineStacks(&buf)
	if buf.Len() == 0 {
		t.Fatal("DumpGoRoutineStacks expected output")
	}
	now := time.Now()
	converted := ConvertToWallClockPT(now)
	if converted.Location() != PTLoc {
		t.Fatalf("ConvertToWallClockPT location = %v", converted.Location())
	}
}

func TestSendGracefulDrain(t *testing.T) {
	t.Parallel()

	doneCtx, doneCancel := context.WithDeadline(context.Background(), time.Now().Add(-time.Hour))
	defer doneCancel()
	if SendWithCtxCheck(doneCtx, make(chan int), 1) {
		t.Fatal("SendWithCtxCheck canceled expected false")
	}
	if !SendWithCtxCheck(context.Background(), make(chan int, 1), 2) {
		t.Fatal("SendWithCtxCheck expected true")
	}

	closer := &retryCloser{failures: 2}
	if !GracefulClose(closer, "test", "closer") {
		t.Fatal("GracefulClose expected true")
	}
	if GracefulClose(&retryCloser{failures: 10}, "test", "closer") {
		t.Fatal("GracefulClose max retries expected false")
	}

	drainCh := make(chan int, 2)
	drainCh <- 1
	close(drainCh)
	DrainChannelSafe(drainCh, "test-drain")
}

type retryCloser struct {
	failures int
	closed   bool
}

func (r *retryCloser) Close() error {
	if r.failures > 0 {
		r.failures--
		return errors.New("close failed")
	}
	r.closed = true
	return nil
}

func TestIsBinaryContentAndFormatRelativeTime(t *testing.T) {
	t.Parallel()

	if IsBinaryContent(nil) {
		t.Fatal("IsBinaryContent nil expected false")
	}
	nulls := make([]byte, 200)
	for i := range nulls {
		nulls[i] = 0
	}
	if !IsBinaryContent(nulls) {
		t.Fatal("IsBinaryContent null-heavy expected true")
	}
	if IsBinaryContent([]byte("plain text")) {
		t.Fatal("IsBinaryContent text expected false")
	}
	if !IsBinaryContent([]byte{0xff, 0xfe, 0xfd}) {
		t.Fatal("IsBinaryContent invalid utf8 expected true")
	}

	now := time.Now()
	if got := FormatRelativeTime(now.Add(-90 * time.Second)); got != "1 minute ago" {
		t.Fatalf("FormatRelativeTime minute singular = %q", got)
	}
	if got := FormatRelativeTime(now.Add(-2 * time.Hour)); got != "2 hours ago" {
		t.Fatalf("FormatRelativeTime hours = %q", got)
	}
	if got := FormatRelativeTime(now.Add(-48 * time.Hour)); got != "2 days ago" {
		t.Fatalf("FormatRelativeTime days = %q", got)
	}
	if got := FormatRelativeTime(now.Add(-60 * 24 * time.Hour)); got != "2 months ago" {
		t.Fatalf("FormatRelativeTime months = %q", got)
	}
	if got := FormatRelativeTime(now.Add(-400 * 24 * time.Hour)); got != "1 year ago" {
		t.Fatalf("FormatRelativeTime years = %q", got)
	}
}

func TestCompareMarshalEdgeCases(t *testing.T) {
	t.Parallel()

	if CompareAsMarshaledJson(map[string]int{"a": 1}, nil) {
		t.Fatal("CompareAsMarshaledJson one nil expected false")
	}
	sameSlice := []int{1}
	if !JsonValEqual(sameSlice, sameSlice) {
		t.Fatal("JsonValEqual same slice pointer expected true")
	}
	if JsonValEqual([]int{1}, []int{2}) {
		t.Fatal("JsonValEqual different slices expected false")
	}
	if _, ok := ToFloat64("bad"); ok {
		t.Fatal("ToFloat64 bad expected false")
	}
	for _, val := range []any{uint(1), uint8(1), uint16(1), uint32(1), uint64(1), float32(1.5)} {
		if _, ok := ToFloat64(val); !ok {
			t.Fatalf("ToFloat64 %#v expected true", val)
		}
		if _, ok := ToInt64(val); !ok {
			t.Fatalf("ToInt64 %#v expected true", val)
		}
	}
	if _, ok := ToStr(1); ok {
		t.Fatal("ToStr non-string expected false")
	}
}

func TestMarshalHelpersEdgeCases(t *testing.T) {
	t.Parallel()

	if _, err := MarshalIndentNoHTMLString(make(chan int), "", "  "); err == nil {
		t.Fatal("MarshalIndentNoHTMLString bad value expected error")
	}
	if err := ReUnmarshal(nil, make(chan int)); err == nil {
		t.Fatal("ReUnmarshal bad value expected error")
	}

	type nested struct {
		Count int `json:"count"`
	}
	var out nested
	if err := MapToStruct(map[string]any{"count": 3}, out); err == nil {
		t.Fatal("MapToStruct non-pointer expected error")
	}
	if err := MapToStruct(map[string]any{"count": 3}, &out); err != nil || out.Count != 3 {
		t.Fatalf("MapToStruct = %+v, %v", out, err)
	}
	if _, err := StructToMap(123); err == nil {
		t.Fatal("StructToMap non-struct expected error")
	}
	m, err := StructToMap(nested{Count: 4})
	if err != nil || m["count"] != 4 {
		t.Fatalf("StructToMap = %#v, %v", m, err)
	}

	field, _ := reflect.TypeOf(nested{}).FieldByName("Count")
	if getJSONName(field) != "count" {
		t.Fatalf("getJSONName = %q", getJSONName(field))
	}
	unexportedType := reflect.TypeOf(struct {
		hidden int
	}{})
	if err := MapToStruct(map[string]any{}, reflect.New(unexportedType).Interface()); err != nil {
		t.Fatalf("MapToStruct empty struct: %v", err)
	}

	if _, _, err := DecodeDataURL("bad"); err == nil {
		t.Fatal("DecodeDataURL bad expected error")
	}
	if _, _, err := DecodeDataURL("data:text/plain"); err == nil {
		t.Fatal("DecodeDataURL missing comma expected error")
	}
	mime, data, err := DecodeDataURL("data:text/plain,hello%20world")
	if err != nil || mime != "text/plain" || string(data) != "hello world" {
		t.Fatalf("DecodeDataURL plain = %q %q %v", mime, data, err)
	}
	if _, _, err := DecodeDataURL("data:text/plain;base64,%%%"); err == nil {
		t.Fatal("DecodeDataURL bad base64 expected error")
	}

	if ContainsBinaryData([]byte{0}) != true {
		t.Fatal("ContainsBinaryData null byte expected true")
	}
}

func TestUtilFnMiscEdgeCases(t *testing.T) {
	t.Parallel()

	if GetStrArr(nil, "x") != nil {
		t.Fatal("GetStrArr nil expected nil")
	}
	if GetStrArr(map[string]any{"x": []any{"a", 1}}, "x") == nil {
		t.Fatal("GetStrArr mixed expected strings")
	}
	if GetBool(map[string]any{"x": "nope"}, "x") {
		t.Fatal("GetBool non-bool expected false")
	}
	if ConvertInt(nil) != 0 {
		t.Fatal("ConvertInt nil expected 0")
	}
	if ShellQuote("has space", false, 8) == "has space" {
		t.Fatal("ShellQuote spaced expected quoting")
	}
	if LongestPrefix("/tmp", []string{"/tmp/a"}) != "/tmp/a" {
		t.Fatalf("LongestPrefix single = %q", LongestPrefix("/tmp", []string{"/tmp/a"}))
	}
	if LongestPrefix("/tmp", []string{"/var/a", "/var/b"}) != "/tmp" {
		t.Fatalf("LongestPrefix mismatch = %q", LongestPrefix("/tmp", []string{"/var/a", "/var/b"}))
	}
	if !ContainsStr([]string{"a"}, "a") || IsPrefix([]string{"/tmp/x"}, "/tmp") {
	} else {
		t.Fatal("ContainsStr/IsPrefix basic failed")
	}
	if _, err := AddInt(math.MaxInt, 1); err == nil {
		t.Fatal("AddInt overflow expected error")
	}
	if !StrsEqual(nil, nil) || StrsEqual([]string{"a"}, nil) {
		t.Fatal("StrsEqual nil cases failed")
	}
	if !StrMapsEqual(map[string]string{"a": "1"}, map[string]string{"a": "1"}) {
		t.Fatal("StrMapsEqual expected true")
	}
	if _, err := DecodeStringMap([]byte("bad")); err == nil {
		t.Fatal("DecodeStringMap bad expected error")
	}
	if !EncodedStringArrayHasFirstVal(EncodeStringArray([]string{"a"}), "a") {
		t.Fatal("EncodedStringArrayHasFirstVal expected true")
	}
	if EncodedStringArrayGetFirstVal(EncodeStringArray([]string{"a"})) != "a" {
		t.Fatal("EncodedStringArrayGetFirstVal failed")
	}
	if _, err := NullDecodeStr([]byte{'\\', 'x'}); err == nil {
		t.Fatal("NullDecodeStr invalid escape expected error")
	}
	if RemoveElemFromSlice([]string{"only"}, "only") != nil {
		t.Fatal("RemoveElemFromSlice last expected nil")
	}
	if got := AddElemToSliceUniq([]string{"a"}, "a"); len(got) != 1 {
		t.Fatal("AddElemToSliceUniq duplicate expected unchanged")
	}
	if !StarMatchString("a.*.c", "a.b.c", ".") {
		t.Fatal("StarMatchString middle star expected true")
	}
	if arch, err := FilterValidArch("amd64"); err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch amd64 = %q, %v", arch, err)
	}
	if _, err := FilterValidArch("mips"); err == nil {
		t.Fatal("FilterValidArch bad expected error")
	}
	if GetFirstLine("only") != "only" {
		t.Fatal("GetFirstLine no newline failed")
	}
	if FindStringInSlice(nil, "x") != -1 {
		t.Fatal("FindStringInSlice nil expected -1")
	}
	hex, err := RandomHexString(5)
	if err != nil || len(hex) != 5 {
		t.Fatalf("RandomHexString = %q, %v", hex, err)
	}
	type tagged struct {
		Name string `json:"name,omitempty"`
	}
	f, _ := reflect.TypeOf(tagged{}).FieldByName("Name")
	if GetJsonTag(f) != "name" {
		t.Fatalf("GetJsonTag = %q", GetJsonTag(f))
	}
	if got := IndentString("  ", "a\n\nb"); !strings.Contains(got, "  a") {
		t.Fatalf("IndentString = %q", got)
	}
}

func TestStreamToLinesEdgeCases(t *testing.T) {
	t.Parallel()

	var lines []string
	err := StreamToLines(strings.NewReader("a\nb\n"), func(line []byte) {
		lines = append(lines, string(line))
	}, nil)
	if err != io.EOF || len(lines) != 2 {
		t.Fatalf("StreamToLines = %#v, %v", lines, err)
	}
	ch := StreamToLinesChan(strings.NewReader("x\n"))
	out := <-ch
	if out.Line != "x" {
		t.Fatalf("StreamToLinesChan = %#v", out)
	}
	timeoutCh := make(chan LineOutput)
	if _, err := ReadLineWithTimeout(timeoutCh, 1*time.Millisecond); err == nil {
		t.Fatal("ReadLineWithTimeout expected timeout")
	}
}

func TestPartialJsonRepair(t *testing.T) {
	t.Parallel()

	val, err := ParsePartialJson([]byte(`{"a":`))
	if err != nil {
		t.Fatalf("ParsePartialJson incomplete: %v", err)
	}
	if val == nil {
		t.Fatal("ParsePartialJson incomplete expected value")
	}
}

var _ io.Reader = errReader{}

func TestOverflowAddIntSlice(t *testing.T) {
	t.Parallel()

	if _, err := AddIntSlice(1, math.MaxInt); err == nil {
		t.Fatal("AddIntSlice overflow expected error")
	}
}
