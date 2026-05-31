// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"strings"
	"testing"
)

type marshalTestStruct struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
	Skip  string
}

func TestMapToStructAndStructToMap(t *testing.T) {
	t.Parallel()

	var out marshalTestStruct
	err := MapToStruct(map[string]any{"name": "alpha", "count": 3}, &out)
	if err != nil {
		t.Fatalf("MapToStruct failed: %v", err)
	}
	if out.Name != "alpha" || out.Count != 3 {
		t.Fatalf("unexpected struct: %#v", out)
	}

	m, err := StructToMap(marshalTestStruct{Name: "beta", Count: 7, Skip: "hidden"})
	if err != nil {
		t.Fatalf("StructToMap failed: %v", err)
	}
	if m["name"] != "beta" || m["count"] != 7 {
		t.Fatalf("unexpected map: %#v", m)
	}
	if m["Skip"] != "hidden" {
		t.Fatalf("expected exported field in map, got %#v", m)
	}
}

func TestMapToStructErrors(t *testing.T) {
	t.Parallel()

	err := MapToStruct(map[string]any{"name": "x"}, marshalTestStruct{})
	if err == nil || !strings.Contains(err.Error(), "pointer") {
		t.Fatalf("expected pointer error, got %v", err)
	}

	var n int
	err = MapToStruct(map[string]any{"name": "x"}, &n)
	if err == nil || !strings.Contains(err.Error(), "struct") {
		t.Fatalf("expected struct error, got %v", err)
	}
}

func TestReUnmarshalAndDoMapStructure(t *testing.T) {
	t.Parallel()

	var out marshalTestStruct
	err := ReUnmarshal(&out, map[string]any{"name": "gamma", "count": 9})
	if err != nil {
		t.Fatalf("ReUnmarshal failed: %v", err)
	}
	if out.Name != "gamma" || out.Count != 9 {
		t.Fatalf("unexpected struct: %#v", out)
	}

	var mapped marshalTestStruct
	err = DoMapStructure(&mapped, map[string]any{"name": "delta", "count": 11})
	if err != nil {
		t.Fatalf("DoMapStructure failed: %v", err)
	}
	if mapped.Name != "delta" || mapped.Count != 11 {
		t.Fatalf("unexpected struct: %#v", mapped)
	}
}

func TestMustPrettyPrintJSON(t *testing.T) {
	t.Parallel()

	str := MustPrettyPrintJSON(map[string]any{"key": "value"})
	if !strings.Contains(str, `"key": "value"`) {
		t.Fatalf("unexpected json: %q", str)
	}
	if strings.Contains(str, "\\u003c") {
		t.Fatalf("expected SetEscapeHTML(false), got %q", str)
	}
}

func TestMarshalIndentNoHTMLString(t *testing.T) {
	t.Parallel()

	str, err := MarshalIndentNoHTMLString(map[string]string{"html": "<tag>"}, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndentNoHTMLString failed: %v", err)
	}
	if !strings.Contains(str, "<tag>") {
		t.Fatalf("expected unescaped html in json: %q", str)
	}
}
