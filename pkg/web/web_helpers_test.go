// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package web

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestMarshalReturnValue(t *testing.T) {
	t.Parallel()

	success := marshalReturnValue(map[string]string{"id": "abc"}, nil)
	var successMap map[string]any
	if err := json.Unmarshal(success, &successMap); err != nil {
		t.Fatalf("unmarshal success: %v", err)
	}
	if successMap["success"] != true {
		t.Fatalf("expected success true, got %v", successMap["success"])
	}

	errPayload := marshalReturnValue(nil, errTest("boom"))
	if !strings.Contains(string(errPayload), "boom") {
		t.Fatalf("expected error payload, got %s", string(errPayload))
	}
}

func TestGetMessageTypeAndStringFromMap(t *testing.T) {
	t.Parallel()

	msg := map[string]any{
		"type":      "event",
		"wscommand": "ping",
		"missing":   123,
	}

	if got := getMessageType(msg); got != "event" {
		t.Fatalf("getMessageType: got %q", got)
	}
	if got := getStringFromMap(msg, "wscommand"); got != "ping" {
		t.Fatalf("getStringFromMap wscommand: got %q", got)
	}
	if got := getStringFromMap(msg, "missing"); got != "" {
		t.Fatalf("getStringFromMap missing: got %q", got)
	}
}

func TestIsAllowedDevCORSOriginExtra(t *testing.T) {
	t.Parallel()

	tests := []struct {
		origin  string
		allowed bool
	}{
		{"http://localhost:3000", true},
		{"http://127.0.0.1:3000", true},
		{"http://localhost", true},
		{"https://localhost:5173", true},
	}
	for _, tc := range tests {
		if got := isAllowedDevCORSOrigin(tc.origin); got != tc.allowed {
			t.Fatalf("origin %q: got %v want %v", tc.origin, got, tc.allowed)
		}
	}
}

type errTest string

func (e errTest) Error() string { return string(e) }
