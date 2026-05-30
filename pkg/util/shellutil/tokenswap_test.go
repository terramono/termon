// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"strings"
	"testing"
	"time"
)

func TestUnpackedTokenTypePackRoundTrip(t *testing.T) {
	t.Parallel()

	unpacked := &UnpackedTokenType{Token: "abc-123"}
	encoded, err := unpacked.Pack()
	if err != nil {
		t.Fatalf("Pack: %v", err)
	}

	got, err := UnpackSwapToken(encoded)
	if err != nil {
		t.Fatalf("UnpackSwapToken: %v", err)
	}
	if got.Token != "abc-123" {
		t.Fatalf("Token = %q", got.Token)
	}
}

func TestTokenSwapEntryLifecycle(t *testing.T) {
	entry := &TokenSwapEntry{
		Token:      "swap-token-1",
		ScriptText: "echo hi",
		Exp:        time.Now().Add(time.Hour),
	}
	if err := AddTokenSwapEntry(entry); err != nil {
		t.Fatalf("AddTokenSwapEntry: %v", err)
	}
	if err := AddTokenSwapEntry(entry); err == nil {
		t.Fatal("expected duplicate token error")
	}

	got := GetAndRemoveTokenSwapEntry("swap-token-1")
	if got == nil || got.ScriptText != "echo hi" {
		t.Fatalf("GetAndRemoveTokenSwapEntry = %#v", got)
	}
	if GetAndRemoveTokenSwapEntry("swap-token-1") != nil {
		t.Fatal("expected token to be removed")
	}
}

func TestTokenSwapEntryPackForClient(t *testing.T) {
	t.Parallel()

	entry := &TokenSwapEntry{Token: "client-token"}
	encoded, err := entry.PackForClient()
	if err != nil {
		t.Fatalf("PackForClient: %v", err)
	}
	unpacked, err := UnpackSwapToken(encoded)
	if err != nil {
		t.Fatalf("UnpackSwapToken: %v", err)
	}
	if unpacked.Token != "client-token" {
		t.Fatalf("Token = %q", unpacked.Token)
	}
}

func TestEncodeEnvVarsForShellTable(t *testing.T) {
	t.Parallel()

	env := map[string]string{"WAVE_TEST": "value one"}

	bashOut, err := EncodeEnvVarsForShell(ShellType_bash, env)
	if err != nil {
		t.Fatalf("bash: %v", err)
	}
	if !strings.Contains(bashOut, "export WAVE_TEST=") {
		t.Fatalf("bash output = %q", bashOut)
	}

	fishOut, err := EncodeEnvVarsForShell(ShellType_fish, env)
	if err != nil {
		t.Fatalf("fish: %v", err)
	}
	if !strings.Contains(fishOut, "set -x WAVE_TEST") {
		t.Fatalf("fish output = %q", fishOut)
	}

	psOut, err := EncodeEnvVarsForShell(ShellType_pwsh, env)
	if err != nil {
		t.Fatalf("pwsh: %v", err)
	}
	if !strings.Contains(psOut, "$env:WAVE_TEST") {
		t.Fatalf("pwsh output = %q", psOut)
	}

	_, err = EncodeEnvVarsForShell("unknown", env)
	if err == nil {
		t.Fatal("expected error for unknown shell type")
	}

	_, err = EncodeEnvVarsForShell(ShellType_bash, map[string]string{"bad-name": "x"})
	if err == nil {
		t.Fatal("expected error for invalid env var name")
	}
}
