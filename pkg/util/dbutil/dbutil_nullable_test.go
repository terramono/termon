// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import "testing"

func TestQuickSetNullableJsonAndQuickNullableJson(t *testing.T) {
	t.Parallel()

	type payload struct {
		Mode string `json:"mode"`
	}

	m := map[string]any{
		"config": []byte(`{"mode":"live"}`),
	}

	var cfg payload
	QuickSetNullableJson(&cfg, m, "config")
	if cfg.Mode != "live" {
		t.Fatalf("QuickSetNullableJson config = %+v", cfg)
	}

	if got := QuickNullableJson(cfg); got != `{"mode":"live"}` {
		t.Fatalf("QuickNullableJson config = %q", got)
	}
	if got := QuickNullableJson(nil); got != "null" {
		t.Fatalf("QuickNullableJson nil = %q", got)
	}

	var missing payload
	QuickSetNullableJson(&missing, map[string]any{}, "config")
	if missing.Mode != "" {
		t.Fatalf("QuickSetNullableJson missing = %+v", missing)
	}
}
