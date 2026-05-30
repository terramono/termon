// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wconfig

import (
	"reflect"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/waveobj"
)

func TestGoBackWS(t *testing.T) {
	t.Parallel()

	barr := []byte("  value  ")
	if got := goBackWS(barr, len(barr)); got != 6 {
		t.Fatalf("goBackWS trailing ws: got %d want 6", got)
	}
	if got := goBackWS(barr, 0); got != 0 {
		t.Fatalf("goBackWS start: got %d", got)
	}
}

func TestGetConfigKeyNamespaceAndOrder(t *testing.T) {
	t.Parallel()

	if got := getConfigKeyNamespace("term:fontsize"); got != "term" {
		t.Fatalf("namespace = %q", got)
	}
	if got := getConfigKeyNamespace("plain"); got != "" {
		t.Fatalf("plain namespace = %q", got)
	}

	ordered := orderConfigKeys(waveobj.MetaMapType{
		"term:b": 1,
		"ai:a":   2,
		"term:a": 3,
	})
	want := []string{"ai:a", "term:a", "term:b"}
	if !reflect.DeepEqual(ordered, want) {
		t.Fatalf("orderConfigKeys = %#v, want %#v", ordered, want)
	}
}

func TestReindentJson(t *testing.T) {
	t.Parallel()

	input := []byte("{\n\"a\":1\n}")
	got := string(reindentJson(input, "  "))
	if got != "{\n  \"a\":1\n  }" {
		t.Fatalf("reindentJson = %q", got)
	}
	if string(reindentJson([]byte("not-json"), "  ")) != "not-json" {
		t.Fatal("expected non-json input unchanged")
	}
}

func TestResolveEnvArray(t *testing.T) {
	t.Setenv("WCONFIG_TEST_ARR", "from-env")
	arr := []interface{}{"$ENV:WCONFIG_TEST_ARR", "plain", map[string]interface{}{"nested": "$ENV:MISSING:fallback"}}
	resolveEnvArray(arr)
	if arr[0] != "from-env" {
		t.Fatalf("arr[0] = %v", arr[0])
	}
	if arr[1] != "plain" {
		t.Fatalf("arr[1] = %v", arr[1])
	}
	nested := arr[2].(map[string]interface{})
	if nested["nested"] != "fallback" {
		t.Fatalf("nested = %v", nested["nested"])
	}
}
