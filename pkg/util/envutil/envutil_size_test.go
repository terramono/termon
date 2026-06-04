// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package envutil

import (
	"strings"
	"testing"
)

func TestSetEnvRejectsOversizedEnvString(t *testing.T) {
	t.Parallel()

	base := MapToEnv(map[string]string{})
	largeVal := strings.Repeat("x", MaxEnvSize)
	_, err := SetEnv(base, "BIG", largeVal)
	if err == nil {
		t.Fatal("expected env string too large error")
	}
}
