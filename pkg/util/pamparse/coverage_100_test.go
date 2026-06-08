// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParsePasswdWithTempFile(t *testing.T) {
	dir := t.TempDir()
	passwd := filepath.Join(dir, "passwd")
	content := "testuser:x:1000:1000:Test:/home/testuser:/bin/bash\n"
	if err := os.WriteFile(passwd, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := passwdPath
	passwdPath = passwd
	defer func() { passwdPath = orig }()
	t.Setenv("USER", "testuser")

	opts, err := ParsePasswd()
	if err != nil || opts == nil || opts.Home != "/home/testuser" {
		t.Fatalf("ParsePasswd = %#v, %v", opts, err)
	}
}

func TestParsePasswdInvalidFields(t *testing.T) {
	dir := t.TempDir()
	passwd := filepath.Join(dir, "passwd")
	if err := os.WriteFile(passwd, []byte("baduser:x:1\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := passwdPath
	passwdPath = passwd
	defer func() { passwdPath = orig }()
	t.Setenv("USER", "baduser")

	if _, err := ParsePasswd(); err == nil {
		t.Fatal("ParsePasswd invalid fields expected error")
	}
}

func TestParsePasswdMissingFile(t *testing.T) {
	orig := passwdPath
	passwdPath = filepath.Join(t.TempDir(), "missing")
	defer func() { passwdPath = orig }()

	if opts := ParsePasswdSafe(); opts != nil {
		t.Fatalf("ParsePasswdSafe missing = %#v", opts)
	}
}

func TestParsePasswdUserNotFound(t *testing.T) {
	dir := t.TempDir()
	passwd := filepath.Join(dir, "passwd")
	if err := os.WriteFile(passwd, []byte("other:x:1:1::/home/other:/bin/sh\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	orig := passwdPath
	passwdPath = passwd
	defer func() { passwdPath = orig }()
	t.Setenv("USER", "nobody-here")

	opts, err := ParsePasswd()
	if err != nil || opts != nil {
		t.Fatalf("ParsePasswd not found = %#v, %v", opts, err)
	}
}

func TestParseEnvironmentConfFileOpenError(t *testing.T) {
	if _, err := ParseEnvironmentConfFile(filepath.Join(t.TempDir(), "missing"), &PamParseOpts{}); err == nil {
		t.Fatal("ParseEnvironmentConfFile missing expected error")
	}
}

func TestParseEnvironmentConfFilePasswdError(t *testing.T) {
	orig := passwdPath
	passwdPath = filepath.Join(t.TempDir(), "missing")
	defer func() { passwdPath = orig }()

	conf := filepath.Join(t.TempDir(), "pam.conf")
	if err := os.WriteFile(conf, []byte("X DEFAULT=val\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := ParseEnvironmentConfFile(conf, nil); err == nil {
		t.Fatal("ParseEnvironmentConfFile passwd error expected")
	}
}

func TestParseEnvironmentFileOpenError(t *testing.T) {
	if _, err := ParseEnvironmentFile(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("ParseEnvironmentFile missing expected error")
	}
}
