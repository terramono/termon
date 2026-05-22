// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wavebase

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExpandHomeDir(t *testing.T) {
	homeDir := t.TempDir()
	t.Setenv("HOME", homeDir)
	if runtimeHome := os.Getenv("USERPROFILE"); runtimeHome != "" {
		t.Setenv("USERPROFILE", homeDir)
	}

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"tilde alone", "~", homeDir},
		{"tilde subpath", "~/docs/readme.txt", filepath.Join(homeDir, "docs/readme.txt")},
		{"absolute passthrough", "/etc/hosts", filepath.Clean("/etc/hosts")},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, err := ExpandHomeDir(tc.input)
			if err != nil {
				t.Fatalf("ExpandHomeDir: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %q want %q", got, tc.want)
			}
		})
	}
}

func TestReplaceHomeDir(t *testing.T) {
	homeDir := t.TempDir()
	t.Setenv("HOME", homeDir)
	if runtimeHome := os.Getenv("USERPROFILE"); runtimeHome != "" {
		t.Setenv("USERPROFILE", homeDir)
	}

	subPath := filepath.Join(homeDir, "wave", "config.json")
	if got := ReplaceHomeDir(homeDir); got != "~" {
		t.Fatalf("home dir: got %q want ~", got)
	}
	if got := ReplaceHomeDir(subPath); !strings.HasPrefix(got, "~/") {
		t.Fatalf("subpath: got %q want ~/ prefix", got)
	}
	if got := ReplaceHomeDir("/tmp/other"); got != "/tmp/other" {
		t.Fatalf("outside path unchanged: got %q", got)
	}
}
