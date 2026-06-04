// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import "testing"

func TestShellQuoteMaxLenTruncation(t *testing.T) {
	t.Parallel()

	long := "needs'quoting because of spaces and more text here"
	got := ShellQuote(long, false, 12)
	if len(got) > 12 {
		t.Fatalf("ShellQuote maxLen = %q (len %d)", got, len(got))
	}
	if got == long {
		t.Fatal("expected truncated quoted string")
	}
}

func TestShellQuoteNoMaxLenWhenNegative(t *testing.T) {
	t.Parallel()

	val := "safe_value"
	if got := ShellQuote(val, false, -1); got != val {
		t.Fatalf("ShellQuote(-1) = %q", got)
	}
}
