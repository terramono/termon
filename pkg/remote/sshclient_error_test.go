// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package remote_test

import (
	"errors"
	"fmt"
	"net"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/remote"
	"github.com/wavetermdev/waveterm/pkg/utilds"
)

func TestSimpleMessageFromPossibleConnectionError(t *testing.T) {
	t.Parallel()

	if got := remote.SimpleMessageFromPossibleConnectionError(nil); got != "" {
		t.Fatalf("got %q, want empty string", got)
	}

	plain := errors.New("connection refused")
	if got := remote.SimpleMessageFromPossibleConnectionError(plain); got != "connection refused" {
		t.Fatalf("got %q", got)
	}

	inner := errors.New("auth failed")
	connErr := remote.ConnectionError{Err: inner}
	if got := remote.SimpleMessageFromPossibleConnectionError(connErr); got != "auth failed" {
		t.Fatalf("got %q, want auth failed", got)
	}
}

func TestClassifyConnError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		err         error
		wantCode    string
		wantSubCode string
	}{
		{
			name:        "coded error",
			err:         utilds.MakeSubCodedError("auth-failed", "handshake-failed", errors.New("x")),
			wantCode:    "auth-failed",
			wantSubCode: "handshake-failed",
		},
		{
			name:        "dns error",
			err:         &net.DNSError{Err: "no such host", Name: "example.com", IsNotFound: true},
			wantCode:    remote.ConnErrCode_Dial,
			wantSubCode: remote.DialSubCode_DNS,
		},
		{
			name:        "auth string",
			err:         errors.New("unable to authenticate, no supported methods"),
			wantCode:    remote.ConnErrCode_AuthFailed,
			wantSubCode: remote.AuthSubCode_UnableToAuth,
		},
		{
			name:        "connection refused string",
			err:         errors.New("dial tcp: connection refused"),
			wantCode:    remote.ConnErrCode_Dial,
			wantSubCode: remote.DialSubCode_Refused,
		},
		{
			name:     "unknown error",
			err:      errors.New("something unexpected"),
			wantCode: remote.ConnErrCode_Unknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			code, subCode := remote.ClassifyConnError(tt.err)
			if code != tt.wantCode || subCode != tt.wantSubCode {
				t.Fatalf("ClassifyConnError() = (%q, %q), want (%q, %q)", code, subCode, tt.wantCode, tt.wantSubCode)
			}
		})
	}
}

func TestClassifyConnErrorWrappedCodedError(t *testing.T) {
	t.Parallel()

	inner := utilds.MakeCodedError("secret-notfound", errors.New("missing"))
	wrapped := fmt.Errorf("load secret: %w", inner)
	code, subCode := remote.ClassifyConnError(wrapped)
	if code != "secret-notfound" || subCode != "" {
		t.Fatalf("ClassifyConnError() = (%q, %q)", code, subCode)
	}
}
