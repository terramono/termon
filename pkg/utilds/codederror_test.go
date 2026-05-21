// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilds_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/utilds"
)

func TestGetErrorCode(t *testing.T) {
	t.Parallel()

	if utilds.GetErrorCode(nil) != "" {
		t.Fatal("expected empty code for nil error")
	}

	baseErr := errors.New("base failure")
	if utilds.GetErrorCode(baseErr) != "" {
		t.Fatal("expected empty code for plain error")
	}

	coded := utilds.MakeCodedError("dial-error", baseErr)
	if got := utilds.GetErrorCode(coded); got != "dial-error" {
		t.Fatalf("GetErrorCode = %q, want dial-error", got)
	}

	wrapped := fmt.Errorf("outer: %w", coded)
	if got := utilds.GetErrorCode(wrapped); got != "dial-error" {
		t.Fatalf("GetErrorCode on wrapped = %q, want dial-error", got)
	}
}

func TestGetErrorSubCode(t *testing.T) {
	t.Parallel()

	subCoded := utilds.MakeSubCodedError("auth-failed", "handshake-failed", errors.New("auth"))
	if got := utilds.GetErrorSubCode(subCoded); got != "handshake-failed" {
		t.Fatalf("GetErrorSubCode = %q, want handshake-failed", got)
	}
}

func TestCodedErrorUnwrap(t *testing.T) {
	t.Parallel()

	baseErr := errors.New("root cause")
	coded := utilds.MakeCodedError("secret-error", baseErr)

	if coded.Error() != "root cause" {
		t.Fatalf("Error() = %q, want root cause", coded.Error())
	}
	if !errors.Is(coded, baseErr) {
		t.Fatal("expected coded error to unwrap to base error")
	}
}

func TestErrorf(t *testing.T) {
	t.Parallel()

	err := utilds.Errorf("config-parse", "invalid config in %s", "settings.json")
	if utilds.GetErrorCode(err) != "config-parse" {
		t.Fatalf("GetErrorCode = %q, want config-parse", utilds.GetErrorCode(err))
	}
	if err.Error() != "invalid config in settings.json" {
		t.Fatalf("Error() = %q", err.Error())
	}
}
