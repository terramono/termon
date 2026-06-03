// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import "testing"

func TestAddTokenSwapEntryRejectsEmptyToken(t *testing.T) {
	t.Parallel()
	if err := AddTokenSwapEntry(&TokenSwapEntry{Token: ""}); err == nil {
		t.Fatal("expected error for empty token")
	}
}
