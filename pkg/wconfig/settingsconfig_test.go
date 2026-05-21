// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wconfig

import (
	"os"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/waveobj"
)

func TestDefaultBoolPtr(t *testing.T) {
	t.Parallel()

	defTrue := true
	defFalse := false

	if got := DefaultBoolPtr(nil, true); got != true {
		t.Fatalf("DefaultBoolPtr(nil, true) = %v", got)
	}
	if got := DefaultBoolPtr(&defFalse, true); got != false {
		t.Fatalf("DefaultBoolPtr(false, true) = %v", got)
	}
	if got := DefaultBoolPtr(&defTrue, false); got != true {
		t.Fatalf("DefaultBoolPtr(true, false) = %v", got)
	}
}

func TestResolveEnvValue(t *testing.T) {
	t.Setenv("WAVETERM_TEST_ENV", "resolved-value")

	tests := []struct {
		name      string
		input     string
		want      string
		wantFound bool
	}{
		{"non env string", "plain", "", false},
		{"existing env var", "$ENV:WAVETERM_TEST_ENV", "resolved-value", true},
		{"missing env with fallback", "$ENV:MISSING_VAR:fallback", "fallback", true},
		{"missing env without fallback", "$ENV:MISSING_VAR_NO_FALLBACK", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := resolveEnvValue(tt.input)
			if got != tt.want || ok != tt.wantFound {
				t.Fatalf("resolveEnvValue(%q) = (%q, %v), want (%q, %v)", tt.input, got, ok, tt.want, tt.wantFound)
			}
		})
	}
}

func TestMergeMetaMapSimple(t *testing.T) {
	t.Parallel()

	base := waveobj.MetaMapType{"a": 1, "b": 2}
	merged := mergeMetaMapSimple(base, waveobj.MetaMapType{"b": nil, "c": 3})
	if merged["a"] != 1 {
		t.Fatalf("expected a=1, got %v", merged["a"])
	}
	if _, ok := merged["b"]; ok {
		t.Fatal("expected b to be deleted")
	}
	if merged["c"] != 3 {
		t.Fatalf("expected c=3, got %v", merged["c"])
	}

	nilResult := mergeMetaMapSimple(nil, waveobj.MetaMapType{"x": 1})
	if nilResult["x"] != 1 {
		t.Fatalf("expected x=1 on nil base, got %v", nilResult)
	}

	empty := mergeMetaMapSimple(waveobj.MetaMapType{"only": nil}, waveobj.MetaMapType{"only": nil})
	if empty != nil {
		t.Fatalf("expected nil map when empty after merge, got %v", empty)
	}
}

func TestResolveEnvReplacements(t *testing.T) {
	t.Setenv("WCONFIG_TEST_KEY", "from-env")

	meta := waveobj.MetaMapType{
		"key": "$ENV:WCONFIG_TEST_KEY",
		"nested": map[string]interface{}{
			"arr": []interface{}{"$ENV:WCONFIG_TEST_KEY", "static"},
		},
	}
	resolveEnvReplacements(meta)

	if meta["key"] != "from-env" {
		t.Fatalf("expected resolved key, got %v", meta["key"])
	}
	nested := meta["nested"].(map[string]interface{})
	arr := nested["arr"].([]interface{})
	if arr[0] != "from-env" || arr[1] != "static" {
		t.Fatalf("unexpected nested array: %v", arr)
	}
}

func TestResolveEnvValueUsesLookupEnv(t *testing.T) {
	key := "WCONFIG_LOOKUP_TEST"
	os.Unsetenv(key)
	got, ok := resolveEnvValue("$ENV:" + key + ":default")
	if !ok || got != "default" {
		t.Fatalf("resolveEnvValue fallback = (%q, %v)", got, ok)
	}
}
