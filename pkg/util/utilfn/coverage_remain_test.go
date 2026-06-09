// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"bytes"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestJsonValEqualIncomparable(t *testing.T) {
	s1 := []int{1}
	s2 := []int{1}
	if JsonValEqual(s1, s2) {
		t.Fatal("JsonValEqual different slice pointers expected false")
	}
	if JsonValEqual(map[string]int{"a": 1}, map[string]int{"a": 1}) {
		t.Fatal("JsonValEqual different map pointers expected false")
	}
}

func TestToFloat64AllUintTypes(t *testing.T) {
	cases := []any{int8(1), int16(2), uint(3), uint16(4), uint32(5), uint64(6), float32(7)}
	for _, c := range cases {
		if _, ok := ToFloat64(c); !ok {
			t.Fatalf("ToFloat64 %#v expected ok", c)
		}
	}
}

func TestToInt64AllTypes(t *testing.T) {
	cases := []any{int8(1), int16(2), int32(3), uint(4), uint8(5), uint16(6), uint32(7), uint64(8), float32(9), float64(10)}
	for _, c := range cases {
		if _, ok := ToInt64(c); !ok {
			t.Fatalf("ToInt64 %#v expected ok", c)
		}
	}
}

func TestStrMapsEqualExtraKeyOnlyInM2(t *testing.T) {
	m1 := map[string]string{"a": "1", "b": "2"}
	m2 := map[string]string{"a": "1", "c": "3"}
	if StrMapsEqual(m1, m2) {
		t.Fatal("StrMapsEqual different keys same len expected false")
	}
}

func TestByteMapsEqualExtraKeyOnlyInM2(t *testing.T) {
	m1 := map[string][]byte{"a": {1}}
	m2 := map[string][]byte{"b": {2}}
	if ByteMapsEqual(m1, m2) {
		t.Fatal("ByteMapsEqual different keys expected false")
	}
}

func TestDecodeStringMapEmpty(t *testing.T) {
	got, err := DecodeStringMap(nil)
	if err != nil || got != nil {
		t.Fatalf("DecodeStringMap empty = %#v, %v", got, err)
	}
}

func TestDecodeStringMapNullDecodeErrors(t *testing.T) {
	badKey := append([]byte{'\\', 'z'}, []byte("=v")...)
	if _, err := DecodeStringMap(badKey); err == nil {
		t.Fatal("DecodeStringMap key decode error expected")
	}
	eq := NullEncodeStr("k")
	badVal := append(append(eq, byte('=')), []byte{'\\', 'z'}...)
	if _, err := DecodeStringMap(badVal); err == nil {
		t.Fatal("DecodeStringMap val decode error expected")
	}
}

func TestDecodeStringArrayItemError(t *testing.T) {
	bad := append(NullEncodeStr("ok"), []byte{'\\', 'z'}...)
	if _, err := DecodeStringArray(bad); err == nil {
		t.Fatal("DecodeStringArray item error expected")
	}
}

func TestCombineStrArraysDuplicateInSecond(t *testing.T) {
	got := CombineStrArrays([]string{"a"}, []string{"a", "b"})
	if !StrsEqual(got, []string{"a", "b"}) {
		t.Fatalf("CombineStrArrays = %#v", got)
	}
}

func TestCombineStrArraysDuplicateInFirst(t *testing.T) {
	got := CombineStrArrays([]string{"a", "a", "b"}, []string{"c"})
	if !StrsEqual(got, []string{"a", "b", "c"}) {
		t.Fatalf("CombineStrArrays duplicate first = %#v", got)
	}
}

func TestStreamToLinesReadCallback(t *testing.T) {
	called := false
	_ = StreamToLines(strings.NewReader("a\n"), func([]byte) {}, func() { called = true })
	if !called {
		t.Fatal("StreamToLines readCallback expected call")
	}
}

func TestRepairJsonEscapedTrim(t *testing.T) {
	got := repairJson([]byte(`{"a":"\\`))
	if len(got) == 0 {
		t.Fatal("repairJson escaped trim expected data")
	}
}

func TestStructToMapPointerInput(t *testing.T) {
	type s struct{ N int }
	val := s{N: 2}
	got, err := StructToMap(&val)
	if err != nil || got["N"] != 2 {
		t.Fatalf("StructToMap pointer = %#v, %v", got, err)
	}
}

func TestSetValueAssignableBranch(t *testing.T) {
	type alias int
	var n int
	if err := setValue(reflect.ValueOf(&n).Elem(), alias(3)); err != nil {
		t.Fatalf("setValue assignable: %v", err)
	}
}

func TestGetCmdExitCodeProcessStateExitCode(t *testing.T) {
	cmd := exec.Command("false")
	cmdErr := cmd.Run()
	code := GetCmdExitCode(cmd, cmdErr)
	if code == 0 {
		t.Fatalf("GetCmdExitCode false = %d", code)
	}
}

func TestStructToJsonMapUnmarshalError(t *testing.T) {
	orig := structToJsonMapMarshal
	structToJsonMapMarshal = func(v any) ([]byte, error) {
		return []byte(`{"n":`), nil
	}
	defer func() { structToJsonMapMarshal = orig }()
	if _, err := StructToJsonMap(struct{ N int }{1}); err == nil {
		t.Fatal("StructToJsonMap unmarshal error expected")
	}
}

func TestAtomicRenameCopyIoCopyError(t *testing.T) {
	dir := t.TempDir()
	dst := filepath.Join(dir, "dst.txt")
	if err := AtomicRenameCopy(dst, filepath.Join(dir, "missing.txt"), 0644); err == nil {
		t.Fatal("AtomicRenameCopy open src error expected")
	}
}

func TestAtomicRenameCopyCloseAndChmodErrors(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.txt")
	if err := os.WriteFile(src, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	blocker := filepath.Join(dir, "blocker")
	if err := os.Mkdir(blocker, 0500); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := AtomicRenameCopy(filepath.Join(blocker, "dst.txt"), src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy blocked dst expected error")
	}
}

func TestRandomHexStringRandError(t *testing.T) {
	orig := randReadFn
	randReadFn = func([]byte) (int, error) { return 0, errors.New("rand fail") }
	defer func() { randReadFn = orig }()
	if _, err := RandomHexString(4); err == nil {
		t.Fatal("RandomHexString rand error expected")
	}
}

func TestWriteFileIfDifferentWriteError(t *testing.T) {
	dir := t.TempDir()
	blocker := filepath.Join(dir, "blocker")
	if err := os.WriteFile(blocker, []byte("x"), 0444); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := WriteFileIfDifferent(blocker, []byte("y")); err == nil {
		t.Fatal("WriteFileIfDifferent write error expected")
	}
}

func TestFilterValidArchCases(t *testing.T) {
	if arch, err := FilterValidArch("x86_64"); err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch x86_64 = %q, %v", arch, err)
	}
	if _, err := FilterValidArch("mips"); err == nil {
		t.Fatal("FilterValidArch unknown expected error")
	}
}

func TestJsonValEqualNonNumericMismatch(t *testing.T) {
	if JsonValEqual("a", 1) {
		t.Fatal("JsonValEqual string vs int expected false")
	}
}

func TestToInt64FloatTypes(t *testing.T) {
	if _, ok := ToInt64(float32(1.5)); !ok {
		t.Fatal("ToInt64 float32 expected ok")
	}
}

func TestAtomicRenameCopyRemainingErrors(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.txt")
	if err := os.WriteFile(src, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	dst := filepath.Join(dir, "dst.txt")

	origCopy := ioCopyFn
	ioCopyFn = func(dst io.Writer, src io.Reader) (int64, error) {
		return 0, errors.New("copy fail")
	}
	if err := AtomicRenameCopy(dst, src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy copy error expected")
	}
	ioCopyFn = origCopy

	if err := AtomicRenameCopy(filepath.Join(dir, "nodir", "dst.txt"), src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy rename error expected")
	}
}

func TestDrainChannelSafeTimeoutLog(t *testing.T) {
	orig := drainChannelSafeTimeout
	drainChannelSafeTimeout = 20 * time.Millisecond
	defer func() { drainChannelSafeTimeout = orig }()
	ch := make(chan int)
	DrainChannelSafe(ch, "timeout-log")
	time.Sleep(50 * time.Millisecond)
}

func TestStructToMapNonStruct(t *testing.T) {
	if _, err := StructToMap(42); err == nil {
		t.Fatal("StructToMap non-struct expected error")
	}
}

func TestStructToMapSkipsUnexported(t *testing.T) {
	type s struct {
		Pub string
		pri string
	}
	got, err := StructToMap(s{Pub: "x", pri: "y"})
	if err != nil || got["Pub"] != "x" {
		t.Fatalf("StructToMap = %#v, %v", got, err)
	}
	if _, ok := got["pri"]; ok {
		t.Fatal("StructToMap unexported field should be absent")
	}
}

func TestSetValuePointerAndConvert(t *testing.T) {
	type nested struct {
		N int
	}
	var num int
	if err := setValue(reflect.ValueOf(&num).Elem(), int64(4)); err != nil {
		t.Fatalf("setValue convert: %v", err)
	}
	var ptr *nested
	nestedVal := nested{N: 1}
	if err := setValue(reflect.ValueOf(&ptr).Elem(), &nestedVal); err != nil {
		t.Fatalf("setValue pointer: %v", err)
	}
}

func TestDecodeDataURLEmptyMime(t *testing.T) {
	mime, data, err := DecodeDataURL("data:;base64,YQ==")
	if err != nil || mime != "text/plain" || string(data) != "a" {
		t.Fatalf("DecodeDataURL empty mime = %q, %q, %v", mime, data, err)
	}
}

func TestStreamToLinesProcessBufInLongLineRemain(t *testing.T) {
	var lb lineBuf
	lb.inLongLine = true
	streamToLines_processBuf(&lb, []byte("no newline"), func([]byte) {})
	if !lb.inLongLine {
		t.Fatal("streamToLines_processBuf long line expected inLongLine")
	}
}

func TestStreamToLinesChanError(t *testing.T) {
	ch := StreamToLinesChan(errReader{})
	out, ok := <-ch
	if !ok || out.Error == nil {
		t.Fatalf("StreamToLinesChan error = %#v, %v", out, ok)
	}
}

func TestRepairJsonLastComma(t *testing.T) {
	got := repairJson([]byte(`{"a":1,`))
	if !strings.Contains(string(got), "a") {
		t.Fatalf("repairJson lastComma = %s", got)
	}
}

func TestRepairJsonEscapedEndTrim(t *testing.T) {
	got := repairJson([]byte("{\"a\":\"xyz\\"))
	if len(got) == 0 {
		t.Fatal("repairJson escaped end expected data")
	}
}

func TestCopyWithEndBytesCopyErrorRemain(t *testing.T) {
	_, err := CopyWithEndBytes(&bytes.Buffer{}, failReaderRemain{}, []byte("END"))
	if err == nil {
		t.Fatal("CopyWithEndBytes copy error expected")
	}
}

type failReaderRemain struct{}

func (failReaderRemain) Read([]byte) (int, error) { return 0, errors.New("read fail") }

func TestToInt64IntAndInt64(t *testing.T) {
	if v, ok := ToInt64(int(7)); !ok || v != 7 {
		t.Fatalf("ToInt64 int = %d, %v", v, ok)
	}
	if v, ok := ToInt64(int64(9)); !ok || v != 9 {
		t.Fatalf("ToInt64 int64 = %d, %v", v, ok)
	}
}

func TestJsonValEqualFuncMismatch(t *testing.T) {
	if JsonValEqual(func() {}, func() {}) {
		t.Fatal("JsonValEqual func values expected false")
	}
}

func TestGetCmdExitCodeNonWaitStatus(t *testing.T) {
	orig := getCmdWaitStatusFn
	getCmdWaitStatusFn = func(*os.ProcessState) (syscall.WaitStatus, bool) {
		return syscall.WaitStatus(0), false
	}
	defer func() { getCmdWaitStatusFn = orig }()

	cmd := exec.Command("true")
	_ = cmd.Run()
	code := GetCmdExitCode(cmd, nil)
	if code != 0 {
		t.Fatalf("GetCmdExitCode fallback = %d", code)
	}
}

func TestAtomicRenameCopyCloseChmodRenameErrors(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.txt")
	if err := os.WriteFile(src, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	dst := filepath.Join(dir, "dst.txt")

	origClose := atomicRenameCloseFn
	atomicRenameCloseFn = func(*os.File) error { return errors.New("close fail") }
	if err := AtomicRenameCopy(dst, src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy close error expected")
	}
	atomicRenameCloseFn = origClose

	origChmod := atomicRenameChmodFn
	atomicRenameChmodFn = func(string, os.FileMode) error { return errors.New("chmod fail") }
	if err := AtomicRenameCopy(dst, src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy chmod error expected")
	}
	atomicRenameChmodFn = origChmod

	origRename := atomicRenameRenameFn
	atomicRenameRenameFn = func(string, string) error { return errors.New("rename fail") }
	if err := AtomicRenameCopy(dst, src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy rename error expected")
	}
	atomicRenameRenameFn = origRename
}

func TestFilterValidArchAmd64(t *testing.T) {
	if arch, err := FilterValidArch("amd64"); err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch amd64 = %q, %v", arch, err)
	}
	if arch, err := FilterValidArch("x64"); err != nil || arch != "x64" {
		t.Fatalf("FilterValidArch x64 = %q, %v", arch, err)
	}
}

func TestSetValueAssignableExactType(t *testing.T) {
	type myInt int
	var n myInt
	if err := setValue(reflect.ValueOf(&n).Elem(), myInt(5)); err != nil {
		t.Fatalf("setValue exact type: %v", err)
	}
}

func TestSetValueConvertibleToField(t *testing.T) {
	type myInt int
	var n myInt
	if err := setValue(reflect.ValueOf(&n).Elem(), int(7)); err != nil {
		t.Fatalf("setValue convertible: %v", err)
	}
	if n != 7 {
		t.Fatalf("setValue convertible = %d", n)
	}
}

func TestSetValueAssignableDefinedType(t *testing.T) {
	type t1 struct{ X int }
	type t2 t1
	var v t2
	if err := setValue(reflect.ValueOf(&v).Elem(), t1{X: 3}); err != nil {
		t.Fatalf("setValue assignable defined: %v", err)
	}
}

func TestSetValuePointerConvertibleElem(t *testing.T) {
	type myInt int
	var p *myInt
	if err := setValue(reflect.ValueOf(&p).Elem(), int(4)); err != nil {
		t.Fatalf("setValue pointer convertible: %v", err)
	}
	if p == nil || *p != 4 {
		t.Fatalf("setValue pointer convertible = %#v", p)
	}
}

func TestSetValuePointerElemTypeError(t *testing.T) {
	var p *int
	if err := setValue(reflect.ValueOf(&p).Elem(), "bad"); err == nil {
		t.Fatal("setValue pointer bad elem expected error")
	}
}

func TestSetValueAssignableMyInt(t *testing.T) {
	type myInt int
	type myInt2 myInt
	var v myInt2
	if err := setValue(reflect.ValueOf(&v).Elem(), myInt(8)); err != nil {
		t.Fatalf("setValue assignable myInt: %v", err)
	}
}

func TestSetValueAssignableInterface(t *testing.T) {
	var w io.Writer
	buf := &bytes.Buffer{}
	if !reflect.TypeOf(buf).AssignableTo(reflect.TypeOf((*io.Writer)(nil)).Elem()) {
		t.Fatal("*bytes.Buffer should be assignable to io.Writer")
	}
	if err := setValue(reflect.ValueOf(&w).Elem(), buf); err != nil {
		t.Fatalf("setValue interface assignable: %v", err)
	}
}

func TestSetValueAssignableDefinedInt(t *testing.T) {
	type base int
	type derived base
	var d derived
	if err := setValue(reflect.ValueOf(&d).Elem(), base(5)); err != nil {
		t.Fatalf("setValue assignable defined int: %v", err)
	}
	if int(d) != 5 {
		t.Fatalf("setValue assignable defined int = %d", d)
	}
}

func TestSetValuePointerFromStructValue(t *testing.T) {
	type inner struct{ V int }
	var p *inner
	if err := setValue(reflect.ValueOf(&p).Elem(), inner{V: 2}); err != nil {
		t.Fatalf("setValue pointer from struct: %v", err)
	}
	if p == nil || p.V != 2 {
		t.Fatalf("setValue pointer from struct = %#v", p)
	}
}
