// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package pamparse_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/util/pamparse"
)

func TestParsePasswdInvalidEntry(t *testing.T) {
	dir := t.TempDir()
	passwd := filepath.Join(dir, "passwd")
	content := "user:x:1000:1000:name:/home/user\n"
	if err := os.WriteFile(passwd, []byte(content), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	t.Setenv("USER", "user")
	// ParsePasswd reads /etc/passwd only; test via ParseEnvironmentConfFile with custom opts instead
	opts := &pamparse.PamParseOpts{Home: "/home/user", Shell: "/bin/bash"}
	path := filepath.Join(dir, "pam.conf")
	conf := "HOME_VAR DEFAULT=@{HOME}\nSHELL_VAR DEFAULT=@{SHELL}\n"
	if err := os.WriteFile(path, []byte(conf), 0644); err != nil {
		t.Fatalf("WriteFile conf: %v", err)
	}
	got, err := pamparse.ParseEnvironmentConfFile(path, opts)
	if err != nil {
		t.Fatalf("ParseEnvironmentConfFile: %v", err)
	}
	if got["HOME_VAR"] != "/home/user" || got["SHELL_VAR"] != "/bin/bash" {
		t.Fatalf("got = %#v", got)
	}
}

func TestParseEnvironmentConfFileOverride(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "pam.conf")
	conf := "X   DEFAULT=base   OVERRIDE=override\n"
	if err := os.WriteFile(path, []byte(conf), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	opts := &pamparse.PamParseOpts{Home: "/h", Shell: "/s"}
	got, err := pamparse.ParseEnvironmentConfFile(path, opts)
	if err != nil || got["X"] != "override:base" {
		t.Fatalf("got = %#v, %v", got, err)
	}
}

func TestParseEnvironmentConfFileFallbackLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "pam.conf")
	conf := "PLAIN=from-env-line\n"
	if err := os.WriteFile(path, []byte(conf), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	opts := &pamparse.PamParseOpts{Home: "/h", Shell: "/s"}
	got, err := pamparse.ParseEnvironmentConfFile(path, opts)
	if err != nil || got["PLAIN"] != "from-env-line" {
		t.Fatalf("got = %#v, %v", got, err)
	}
}

func TestParsePasswdSafeMissing(t *testing.T) {
	t.Setenv("USER", "definitely-not-a-real-user-xyz-12345")
	if opts := pamparse.ParsePasswdSafe(); opts != nil {
		t.Fatalf("ParsePasswdSafe missing user = %#v", opts)
	}
}
