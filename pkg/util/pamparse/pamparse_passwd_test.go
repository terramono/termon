// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse_test

import (
	"testing"

	"github.com/wavetermdev/waveterm/pkg/util/pamparse"
)

func TestParsePasswdSafe(t *testing.T) {
	opts := pamparse.ParsePasswdSafe()
	if opts == nil {
		t.Skip("ParsePasswd unavailable in this environment")
	}
	if opts.Home == "" || opts.Shell == "" {
		t.Fatalf("expected home and shell from passwd, got %#v", opts)
	}
}

func TestParsePasswdSafeReturnsNilOnFailure(t *testing.T) {
	t.Setenv("USER", "__nonexistent_user_for_pamparse_test__")
	opts := pamparse.ParsePasswdSafe()
	if opts != nil {
		t.Fatalf("expected nil opts for missing user, got %#v", opts)
	}
}
