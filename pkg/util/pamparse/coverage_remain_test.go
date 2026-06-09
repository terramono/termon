// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParsePasswdScannerError(t *testing.T) {
	dir := t.TempDir()
	passwd := filepath.Join(dir, "passwd")
	line := strings.Repeat("x", 70*1024) + "\n"
	if err := os.WriteFile(passwd, []byte(line), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := passwdPath
	passwdPath = passwd
	defer func() { passwdPath = orig }()
	t.Setenv("USER", "x")

	if _, err := ParsePasswd(); err == nil {
		t.Fatal("ParsePasswd scanner error expected")
	}
}
