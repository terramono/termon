// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestGetBoolAndConvertHelpers(t *testing.T) {
	if GetBool(nil, "x") {
		t.Fatal("GetBool nil expected false")
	}
	if GetBool("not-map", "x") {
		t.Fatal("GetBool non-map expected false")
	}
	if GetBool(map[string]any{"x": "not-bool"}, "x") {
		t.Fatal("GetBool wrong type expected false")
	}
	if !GetBool(map[string]any{"x": true}, "x") {
		t.Fatal("GetBool true expected true")
	}

	if ConvertInt(nil) != 0 || ConvertInt("bad") != 0 {
		t.Fatal("ConvertInt bad values expected 0")
	}
	if ConvertInt(3) != 3 || ConvertInt(int64(4)) != 4 || ConvertInt(float64(5)) != 5 {
		t.Fatal("ConvertInt numeric failed")
	}
	if ConvertInt(0) != 0 {
		t.Fatal("ConvertInt zero failed")
	}

	if ConvertMap(nil) != nil || ConvertMap("bad") != nil {
		t.Fatal("ConvertMap bad expected nil")
	}
	if m := ConvertMap(map[string]any{"a": 1}); m["a"] != 1 {
		t.Fatal("ConvertMap failed")
	}
}

func TestSetValueBranches(t *testing.T) {
	type inner struct {
		N int
	}
	type outer struct {
		Count int
		Inner inner
		Ptr   *int
	}
	var o outer
	if err := setValue(reflect.ValueOf(&o.Count).Elem(), float64(2)); err != nil {
		t.Fatalf("setValue convert: %v", err)
	}
	if err := setValue(reflect.ValueOf(&o.Inner).Elem(), inner{N: 1}); err != nil {
		t.Fatalf("setValue struct: %v", err)
	}
	n := 7
	if err := setValue(reflect.ValueOf(&o.Ptr).Elem(), &n); err != nil {
		t.Fatalf("setValue ptr: %v", err)
	}
	if err := setValue(reflect.ValueOf(&o.Count).Elem(), make(chan int)); err == nil {
		t.Fatal("setValue incompatible expected error")
	}
}

func TestDecodeHelpers(t *testing.T) {
	if _, err := DecodeStringMap([]byte("not-json")); err == nil {
		t.Fatal("DecodeStringMap bad json expected error")
	}
	if got, err := DecodeStringArray(nil); err != nil || got != nil {
		t.Fatalf("DecodeStringArray nil = %#v, %v", got, err)
	}
}

func TestAtomicRenameCopyErrors(t *testing.T) {
	dir := t.TempDir()
	dst := filepath.Join(dir, "dst.txt")
	src := filepath.Join(dir, "missing.txt")
	if err := AtomicRenameCopy(dst, src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy missing src expected error")
	}

	srcPath := filepath.Join(dir, "src.txt")
	if err := os.WriteFile(srcPath, []byte("data"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	blocker := filepath.Join(dir, "blocker")
	if err := os.Mkdir(blocker, 0500); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	if err := AtomicRenameCopy(filepath.Join(blocker, "dst.txt"), srcPath, 0644); err == nil {
		t.Fatal("AtomicRenameCopy blocked dst expected error")
	}
}

func TestEllipsisAndTruncate(t *testing.T) {
	if EllipsisStr("short", 3) != "s..." {
		t.Fatalf("EllipsisStr = %q", EllipsisStr("short", 3))
	}
	if TruncateString("short", 3) != "s..." {
		t.Fatalf("TruncateString = %q", TruncateString("short", 3))
	}
}

func TestByteMapsEqualAndFilterValidArch(t *testing.T) {
	if ByteMapsEqual(map[string][]byte{"a": {1}}, map[string][]byte{"a": {2}}) {
		t.Fatal("ByteMapsEqual different expected false")
	}
	if arch, err := FilterValidArch("arm64"); err != nil || arch != "arm64" {
		t.Fatalf("FilterValidArch arm64 = %q, %v", arch, err)
	}
	if _, err := FilterValidArch("bad-arch"); err == nil {
		t.Fatal("FilterValidArch bad expected error")
	}
}

func TestGetJsonTagEmbedded(t *testing.T) {
	type tagged struct {
		Name string `json:"custom_name"`
	}
	if GetJsonTag(reflect.TypeOf(tagged{}).Field(0)) != "custom_name" {
		t.Fatal("GetJsonTag failed")
	}
}

func TestSendWithCtxCheckCanceled(t *testing.T) {
	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer cancel()
	ch := make(chan int)
	if SendWithCtxCheck(ctx, ch, 1) {
		t.Fatal("SendWithCtxCheck expired ctx expected false")
	}
}

func TestContainsBinaryDataNull(t *testing.T) {
	if !ContainsBinaryData([]byte{0}) {
		t.Fatal("ContainsBinaryData null expected true")
	}
}

func TestDecodeDataURLInvalid(t *testing.T) {
	if _, _, err := DecodeDataURL("not-data"); err == nil {
		t.Fatal("DecodeDataURL invalid expected error")
	}
	if _, _, err := DecodeDataURL("data:text/plain"); err == nil {
		t.Fatal("DecodeDataURL missing comma expected error")
	}
}

func TestDoMapStructureInvalidOut(t *testing.T) {
	var n int
	if err := DoMapStructure(n, map[string]any{"a": 1}); err == nil {
		t.Fatal("DoMapStructure non-pointer expected error")
	}
}

func TestGetCmdExitCodeNilProcess(t *testing.T) {
	if code := GetCmdExitCode(nil, errors.New("fail")); code != -1 {
		t.Fatalf("GetCmdExitCode nil cmd = %d", code)
	}
	if code := GetCmdExitCode(nil, nil); code != 0 {
		t.Fatalf("GetCmdExitCode nil = %d", code)
	}
}

func TestGetExitCodeBranches(t *testing.T) {
	if code := GetExitCode(nil); code != 0 {
		t.Fatalf("GetExitCode nil = %d", code)
	}
	if code := GetExitCode(errors.New("plain")); code != -1 {
		t.Fatalf("GetExitCode plain = %d", code)
	}
}
