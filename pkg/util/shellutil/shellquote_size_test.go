// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"strings"
	"testing"
)

func TestHardQuoteRejectsOversizedStrings(t *testing.T) {
	t.Parallel()

	oversized := strings.Repeat("!", MaxQuoteSize+1)
	if got := HardQuote(oversized); got != "" {
		t.Fatalf("HardQuote oversized = %q, want empty", got)
	}
	if got := HardQuoteFish(oversized); got != "" {
		t.Fatalf("HardQuoteFish oversized = %q, want empty", got)
	}
	if got := HardQuotePowerShell(oversized); got != "" {
		t.Fatalf("HardQuotePowerShell oversized = %q, want empty", got)
	}
}

func TestSoftQuoteRejectsOversizedStrings(t *testing.T) {
	t.Parallel()

	oversized := strings.Repeat("a ", MaxQuoteSize)
	if got := SoftQuote(oversized); got != "" {
		t.Fatalf("SoftQuote oversized = %q, want empty", got)
	}
}
