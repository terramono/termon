// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package envutil

import (
	"strings"
	"testing"
)

func TestEnvToMapAndMapToEnv(t *testing.T) {
	t.Parallel()

	envStr := "FOO=bar\x00BAZ=qux\x00"
	envMap := EnvToMap(envStr)
	if envMap["FOO"] != "bar" || envMap["BAZ"] != "qux" {
		t.Fatalf("EnvToMap = %#v", envMap)
	}

	roundTrip := MapToEnv(envMap)
	if !strings.Contains(roundTrip, "FOO=bar") || !strings.Contains(roundTrip, "BAZ=qux") {
		t.Fatalf("MapToEnv = %q", roundTrip)
	}
}

func TestGetSetRmEnv(t *testing.T) {
	t.Parallel()

	base := MapToEnv(map[string]string{"A": "1"})
	if GetEnv(base, "A") != "1" {
		t.Fatalf("GetEnv A")
	}

	updated, err := SetEnv(base, "B", "2")
	if err != nil {
		t.Fatalf("SetEnv: %v", err)
	}
	if GetEnv(updated, "B") != "2" {
		t.Fatalf("GetEnv B after SetEnv")
	}

	removed := RmEnv(updated, "A")
	if GetEnv(removed, "A") != "" {
		t.Fatalf("RmEnv should remove A")
	}
}

func TestSetEnvRejectsInvalidKeysAndValues(t *testing.T) {
	t.Parallel()

	base := MapToEnv(map[string]string{})
	if _, err := SetEnv(base, "BAD=KEY", "v"); err == nil {
		t.Fatal("expected invalid key error")
	}
	if _, err := SetEnv(base, "KEY", "bad\x00value"); err == nil {
		t.Fatal("expected invalid value error")
	}
}

func TestSliceToEnvAndEnvToSlice(t *testing.T) {
	t.Parallel()

	slice := []string{"X=1", "Y=2", ""}
	envStr := SliceToEnv(slice)
	if GetEnv(envStr, "X") != "1" || GetEnv(envStr, "Y") != "2" {
		t.Fatalf("SliceToEnv round trip failed")
	}

	back := EnvToSlice(envStr)
	if len(back) != 2 || back[0] != "X=1" || back[1] != "Y=2" {
		t.Fatalf("EnvToSlice = %#v", back)
	}
}

func TestSliceToMap(t *testing.T) {
	t.Parallel()

	envMap := SliceToMap([]string{"A=alpha", "B=beta", "INVALID"})
	if envMap["A"] != "alpha" || envMap["B"] != "beta" {
		t.Fatalf("SliceToMap = %#v", envMap)
	}
}

func TestCopyAndAddToEnvMap(t *testing.T) {
	t.Parallel()

	orig := map[string]string{"A": "1"}
	copy := CopyAndAddToEnvMap(orig, "B", "2")
	if orig["B"] != "" {
		t.Fatal("CopyAndAddToEnvMap should not mutate original")
	}
	if copy["A"] != "1" || copy["B"] != "2" {
		t.Fatalf("CopyAndAddToEnvMap = %#v", copy)
	}
}

func TestPruneInitialEnv(t *testing.T) {
	t.Parallel()

	input := map[string]string{
		"WAVETERM_DEV":   "1",
		"BASH_FUNC_foo":  "(){",
		"SSH_CLIENT":     "127.0.0.1",
		"HOME":           "/Users/me",
		"XDG_SESSION_ID": "3",
	}
	pruned := PruneInitialEnv(input)
	if len(pruned) != 1 || pruned["HOME"] != "/Users/me" {
		t.Fatalf("PruneInitialEnv = %#v", pruned)
	}
}
