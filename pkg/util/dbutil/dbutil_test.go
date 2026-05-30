// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import (
	"testing"
)

func TestQuickSetters(t *testing.T) {
	t.Parallel()

	m := map[string]any{
		"name":   "alpha",
		"count":  int64(7),
		"small":  3,
		"flag":   int64(1),
		"on":     true,
		"blob":   []byte("data"),
		"config": []byte(`{"mode":"test"}`),
		"tags":   []byte(`["a","b"]`),
	}

	var name string
	QuickSetStr(&name, m, "name")
	if name != "alpha" {
		t.Fatalf("QuickSetStr name = %q", name)
	}

	var count int
	QuickSetInt(&count, m, "count")
	if count != 7 {
		t.Fatalf("QuickSetInt count = %d", count)
	}

	var small int64
	QuickSetInt64(&small, m, "small")
	if small != 3 {
		t.Fatalf("QuickSetInt64 small = %d", small)
	}

	var flag bool
	QuickSetBool(&flag, m, "flag")
	if !flag {
		t.Fatal("QuickSetBool flag expected true")
	}

	var on bool
	QuickSetBool(&on, m, "on")
	if !on {
		t.Fatal("QuickSetBool on expected true")
	}

	var blob []byte
	QuickSetBytes(&blob, m, "blob")
	if string(blob) != "data" {
		t.Fatalf("QuickSetBytes blob = %q", blob)
	}

	type cfg struct {
		Mode string `json:"mode"`
	}
	var config cfg
	QuickSetJson(&config, m, "config")
	if config.Mode != "test" {
		t.Fatalf("QuickSetJson config = %+v", config)
	}

	var tags []string
	QuickSetJsonArr(&tags, m, "tags")
	if len(tags) != 2 || tags[0] != "a" {
		t.Fatalf("QuickSetJsonArr tags = %#v", tags)
	}
}

func TestQuickSetNullableInt64(t *testing.T) {
	t.Parallel()

	var ptr *int64
	QuickSetNullableInt64(&ptr, map[string]any{"val": int64(42)}, "val")
	if ptr == nil || *ptr != 42 {
		t.Fatalf("QuickSetNullableInt64 = %v", ptr)
	}

	QuickSetNullableInt64(&ptr, map[string]any{"val": 9}, "val")
	if ptr == nil || *ptr != 9 {
		t.Fatalf("QuickSetNullableInt64 int = %v", ptr)
	}
}

func TestQuickJsonHelpers(t *testing.T) {
	t.Parallel()

	if got := QuickJson(nil); got != "{}" {
		t.Fatalf("QuickJson(nil) = %q", got)
	}
	if got := QuickNullableJson(nil); got != "null" {
		t.Fatalf("QuickNullableJson(nil) = %q", got)
	}
	if got := QuickJsonArr(nil); got != "[]" {
		t.Fatalf("QuickJsonArr(nil) = %q", got)
	}

	payload := map[string]string{"k": "v"}
	if got := QuickJson(payload); got != `{"k":"v"}` {
		t.Fatalf("QuickJson(payload) = %q", got)
	}
	if got := string(QuickJsonBytes(payload)); got != `{"k":"v"}` {
		t.Fatalf("QuickJsonBytes(payload) = %q", got)
	}
	if got := QuickJsonArr([]string{"x"}); got != `["x"]` {
		t.Fatalf("QuickJsonArr = %q", got)
	}
	if got := string(QuickJsonArrBytes([]string{"x"})); got != `["x"]` {
		t.Fatalf("QuickJsonArrBytes = %q", got)
	}
}

func TestQuickScanJsonAndValueJson(t *testing.T) {
	t.Parallel()

	var out map[string]string
	if err := QuickScanJson(&out, []byte(`{"id":"abc"}`)); err != nil {
		t.Fatalf("QuickScanJson bytes: %v", err)
	}
	if out["id"] != "abc" {
		t.Fatalf("QuickScanJson out = %#v", out)
	}

	var out2 map[string]string
	if err := QuickScanJson(&out2, `{"id":"xyz"}`); err != nil {
		t.Fatalf("QuickScanJson string: %v", err)
	}

	val, err := QuickValueJson(map[string]int{"n": 1})
	if err != nil {
		t.Fatalf("QuickValueJson: %v", err)
	}
	if val != `{"n":1}` {
		t.Fatalf("QuickValueJson = %v", val)
	}

	nilVal, err := QuickValueJson(nil)
	if err != nil || nilVal != "{}" {
		t.Fatalf("QuickValueJson(nil) = (%v, %v)", nilVal, err)
	}
}

func TestParseJsonMapAndArr(t *testing.T) {
	t.Parallel()

	m := ParseJsonMap(`{"a":1}`, false)
	if m == nil || m["a"] != float64(1) {
		t.Fatalf("ParseJsonMap = %#v", m)
	}

	forced := ParseJsonMap("", true)
	if forced == nil {
		t.Fatal("ParseJsonMap forceMake expected empty map")
	}

	bad := ParseJsonMap("{bad", false)
	if bad != nil {
		t.Fatalf("ParseJsonMap bad = %#v", bad)
	}

	arr := ParseJsonArr[string](`["x","y"]`)
	if len(arr) != 2 || arr[1] != "y" {
		t.Fatalf("ParseJsonArr = %#v", arr)
	}
	if ParseJsonArr[string]("{") != nil {
		t.Fatal("ParseJsonArr invalid expected nil")
	}
}

func TestCheckNil(t *testing.T) {
	t.Parallel()

	if !CheckNil(nil) {
		t.Fatal("CheckNil(nil) expected true")
	}
	var s []string
	if !CheckNil(s) {
		t.Fatal("CheckNil(nil slice) expected true")
	}
	if CheckNil("hello") {
		t.Fatal("CheckNil(string) expected false")
	}
}
