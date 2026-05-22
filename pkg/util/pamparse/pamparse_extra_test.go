// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/util/pamparse"
)

func TestParseEnvironmentFileCommentsAndExport(t *testing.T) {
	t.Parallel()

	content := `
# comment only
export MY_VAR=value
EMPTY=
QUOTED="hello world"
`
	path := filepath.Join(t.TempDir(), "environment")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	got, err := pamparse.ParseEnvironmentFile(path)
	if err != nil {
		t.Fatalf("ParseEnvironmentFile: %v", err)
	}

	want := map[string]string{
		"MY_VAR":  "value",
		"EMPTY":   "",
		"QUOTED":  "hello world",
	}
	for k, v := range want {
		if got[k] != v {
			t.Fatalf("%s: got %q want %q", k, got[k], v)
		}
	}
	if _, ok := got["# comment only"]; ok {
		t.Fatal("comment line should not produce entry")
	}
}

func TestParseEnvironmentConfFileOverrideOnly(t *testing.T) {
	t.Parallel()

	content := `MY_PATH   DEFAULT=@{HOME}/default   OVERRIDE=/custom/path`
	path := filepath.Join(t.TempDir(), "pam_env.conf")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	got, err := pamparse.ParseEnvironmentConfFile(path, &pamparse.PamParseOpts{
		Home:  "/home/test",
		Shell: "/bin/zsh",
	})
	if err != nil {
		t.Fatalf("ParseEnvironmentConfFile: %v", err)
	}
	if got["MY_PATH"] != "/custom/path:/home/test/default" {
		t.Fatalf("MY_PATH: got %q want %q", got["MY_PATH"], "/custom/path:/home/test/default")
	}
}
