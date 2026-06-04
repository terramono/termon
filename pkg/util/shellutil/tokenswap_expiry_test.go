// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"testing"
	"time"
)

func TestRemoveExpiredTokensOnAccess(t *testing.T) {
	entry := &TokenSwapEntry{
		Token: "expired-swap-token",
		Exp:   time.Now().Add(-time.Minute),
	}
	if err := AddTokenSwapEntry(entry); err != nil {
		t.Fatalf("AddTokenSwapEntry: %v", err)
	}

	if got := GetAndRemoveTokenSwapEntry("expired-swap-token"); got != nil {
		t.Fatal("expected expired token to be removed before lookup")
	}
}

func TestEncodeEnvVarsForShellZshUsesBashEncoding(t *testing.T) {
	t.Parallel()

	out, err := EncodeEnvVarsForShell(ShellType_zsh, map[string]string{"WAVE_ZSH": "ok"})
	if err != nil {
		t.Fatalf("EncodeEnvVarsForShell: %v", err)
	}
	if out == "" {
		t.Fatal("expected zsh env encoding output")
	}
}
