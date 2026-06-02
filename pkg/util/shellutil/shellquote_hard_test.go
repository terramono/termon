// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"strings"
	"testing"
)

func TestWaveshellLocalEnvVars(t *testing.T) {
	t.Parallel()

	env := WaveshellLocalEnvVars("xterm-256color")
	if env["TERM"] != "xterm-256color" {
		t.Fatalf("TERM = %q", env["TERM"])
	}
	if env["TERM_PROGRAM"] != "waveterm" {
		t.Fatalf("TERM_PROGRAM = %q", env["TERM_PROGRAM"])
	}
	if env["WAVETERM"] == "" {
		t.Fatal("WAVETERM should be set")
	}
	if env["WAVETERM_VERSION"] == "" {
		t.Fatal("WAVETERM_VERSION should be set")
	}

	emptyTerm := WaveshellLocalEnvVars("")
	if _, ok := emptyTerm["TERM"]; ok {
		t.Fatal("empty term type should omit TERM")
	}
}

func TestHasDirPart(t *testing.T) {
	t.Parallel()

	if !hasDirPart("/usr/local/git/bin", "git") {
		t.Fatal("hasDirPart expected true for git segment")
	}
	if hasDirPart("/usr/local/bin", "git") {
		t.Fatal("hasDirPart expected false")
	}
}

func TestGetLocalWaveFishFilePath(t *testing.T) {
	t.Parallel()

	path := GetLocalWaveFishFilePath()
	if !strings.Contains(path, "wave.fish") {
		t.Fatalf("GetLocalWaveFishFilePath = %q", path)
	}
}

func TestGetLocalZshZDotDir(t *testing.T) {
	t.Parallel()

	path := GetLocalZshZDotDir()
	if !strings.Contains(path, "zsh") {
		t.Fatalf("GetLocalZshZDotDir = %q", path)
	}
}
