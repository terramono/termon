// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/util/pamparse"
)

func TestParseEnvironmentConfFileWithPasswd(t *testing.T) {
	content := `MY_VAR DEFAULT=plain`
	path := filepath.Join(t.TempDir(), "pam_env.conf")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	got, err := pamparse.ParseEnvironmentConfFile(path, nil)
	if err != nil {
		t.Fatalf("ParseEnvironmentConfFile: %v", err)
	}
	if got["MY_VAR"] == "" {
		t.Fatalf("ParseEnvironmentConfFile = %#v", got)
	}
}

func TestParsePasswdSafeWithConfFile(t *testing.T) {
	opts := pamparse.ParsePasswdSafe()
	if opts == nil || opts.Home == "" || opts.Shell == "" {
		t.Fatalf("ParsePasswdSafe = %#v", opts)
	}
}

func TestParseEnvironmentFileMissing(t *testing.T) {
	if _, err := pamparse.ParseEnvironmentFile(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("ParseEnvironmentFile missing expected error")
	}
}
