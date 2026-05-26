// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wconfig

import "testing"

func TestMergeAiSettings(t *testing.T) {
	t.Parallel()

	base := &AiSettingsType{AiPreset: "default", AiModel: "gpt-4"}
	override := &AiSettingsType{AiModel: "claude-3", AiMaxTokens: 4096}
	merged := MergeAiSettings(base, override)
	if merged.AiPreset != "default" {
		t.Fatalf("AiPreset = %q", merged.AiPreset)
	}
	if merged.AiModel != "claude-3" || merged.AiMaxTokens != 4096 {
		t.Fatalf("unexpected merge: %#v", merged)
	}

	clear := &AiSettingsType{AiClear: true, AiPreset: "fresh", AiModel: "new-model"}
	afterClear := MergeAiSettings(base, override, clear)
	if afterClear.AiPreset != "fresh" || afterClear.AiModel != "new-model" {
		t.Fatalf("AiClear merge failed: %#v", afterClear)
	}
	if afterClear.AiClear {
		t.Fatal("AiClear flag should be reset on result")
	}
}

func TestMergeAiSettingsSkipsNil(t *testing.T) {
	t.Parallel()

	merged := MergeAiSettings(nil, &AiSettingsType{AiName: "solo"})
	if merged.AiName != "solo" {
		t.Fatalf("MergeAiSettings nil skip failed: %#v", merged)
	}
}
