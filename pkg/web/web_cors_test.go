// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package web

import "testing"

func TestIsAllowedDevCORSOrigin(t *testing.T) {
	tests := []struct {
		origin  string
		allowed bool
	}{
		{"http://localhost:5173", true},
		{"http://127.0.0.1:5173", true},
		{"https://evil.example.com", false},
		{"file://localhost", false},
		{"", false},
	}
	for _, tc := range tests {
		got := isAllowedDevCORSOrigin(tc.origin)
		if got != tc.allowed {
			t.Fatalf("origin %q: got %v want %v", tc.origin, got, tc.allowed)
		}
	}
}
