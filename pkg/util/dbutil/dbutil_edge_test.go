// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import (
	"testing"
)

func TestQuickSettersEdgeCases(t *testing.T) {
	t.Parallel()

	var strVal string
	QuickSetStr(&strVal, map[string]any{"name": int64(42)}, "name")
	if strVal != "42" {
		t.Fatalf("QuickSetStr int64 = %q", strVal)
	}
	QuickSetStr(&strVal, map[string]any{"name": true}, "name")
	if strVal != "42" {
		t.Fatalf("QuickSetStr bad type should leave value unchanged")
	}

	var intVal int
	QuickSetInt(&intVal, map[string]any{"count": 7}, "count")
	if intVal != 7 {
		t.Fatalf("QuickSetInt int = %d", intVal)
	}
	QuickSetInt(&intVal, map[string]any{"count": int64(9)}, "count")
	if intVal != 9 {
		t.Fatalf("QuickSetInt int64 = %d", intVal)
	}
	QuickSetInt(&intVal, map[string]any{"count": "bad"}, "count")
	if intVal != 9 {
		t.Fatalf("QuickSetInt bad type should leave value unchanged")
	}

	var int64Val int64
	QuickSetInt64(&int64Val, map[string]any{"count": 5}, "count")
	if int64Val != 5 {
		t.Fatalf("QuickSetInt64 int = %d", int64Val)
	}

	var boolVal bool
	QuickSetBool(&boolVal, map[string]any{"flag": int64(1)}, "flag")
	if !boolVal {
		t.Fatal("QuickSetBool int64 expected true")
	}
	var falseVal bool
	QuickSetBool(&falseVal, map[string]any{"flag": int64(0)}, "flag")
	if falseVal {
		t.Fatal("QuickSetBool int64 0 expected false")
	}

	var bytesVal []byte
	QuickSetBytes(&bytesVal, map[string]any{"blob": "string-bytes"}, "blob")
	if len(bytesVal) != 0 {
		t.Fatalf("QuickSetBytes bad type expected unchanged, got %q", bytesVal)
	}
	QuickSetBytes(&bytesVal, map[string]any{"blob": []byte("raw")}, "blob")
	if string(bytesVal) != "raw" {
		t.Fatalf("QuickSetBytes = %q", bytesVal)
	}
}

func TestQuickJsonAndScanEdgeCases(t *testing.T) {
	t.Parallel()

	if got := string(QuickJsonBytes(nil)); got != "{}" {
		t.Fatalf("QuickJsonBytes nil = %q", got)
	}
	if got := string(QuickJsonArrBytes(nil)); got != "[]" {
		t.Fatalf("QuickJsonArrBytes nil = %q", got)
	}

	var cfg struct {
		Mode string `json:"mode"`
	}
	QuickSetJson(&cfg, map[string]any{"config": ""}, "config")
	if cfg.Mode != "" {
		t.Fatalf("QuickSetJson empty default = %+v", cfg)
	}
	QuickSetJson(&cfg, map[string]any{"config": "not-json"}, "config")
	QuickSetJsonArr(&[]string{}, map[string]any{"tags": "plain"}, "tags")

	if err := QuickScanJson(&cfg, 123); err == nil {
		t.Fatal("QuickScanJson bad type expected error")
	}
	if err := QuickScanJson(&cfg, ""); err != nil {
		t.Fatalf("QuickScanJson empty string: %v", err)
	}
	if err := QuickScanJson(&cfg, []byte{}); err != nil {
		t.Fatalf("QuickScanJson empty bytes: %v", err)
	}

	if _, err := QuickValueJson(map[string]int{"bad": 1}); err != nil {
		t.Fatalf("QuickValueJson: %v", err)
	}

	if got := ParseJsonArr[string]("not-json"); got != nil {
		t.Fatalf("ParseJsonArr bad json = %#v", got)
	}
}
