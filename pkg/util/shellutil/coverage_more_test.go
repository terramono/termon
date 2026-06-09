// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestGetShellVersionAllTypes(t *testing.T) {
	cases := []struct {
		name     string
		shell    string
		shellTyp string
	}{
		{"bash", "/bin/bash", ShellType_bash},
		{"zsh", "/bin/zsh", ShellType_zsh},
		{"fish", "/usr/bin/fish", ShellType_fish},
		{"pwsh", "/usr/bin/pwsh", ShellType_pwsh},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := exec.LookPath(filepath.Base(tc.shell)); err != nil {
				t.Skipf("%s not installed", tc.shell)
			}
			version, err := getShellVersion(tc.shell, tc.shellTyp)
			if err != nil {
				t.Logf("getShellVersion %s: %v", tc.shell, err)
				return
			}
			if version == "" {
				t.Fatalf("getShellVersion %s returned empty version", tc.shell)
			}
		})
	}
	if _, err := getShellVersion("/bin/false", ShellType_unknown); err == nil {
		t.Fatal("getShellVersion unsupported expected error")
	}
}

func TestDetectShellTypeAndVersionFromPathPowerShell(t *testing.T) {
	shellType, version, err := DetectShellTypeAndVersionFromPath("/usr/bin/powershell")
	if shellType != "powershell" {
		t.Fatalf("shellType = %q", shellType)
	}
	if version != "" || err != nil {
		t.Fatalf("version=%q err=%v", version, err)
	}
}

func TestWaveshellLocalEnvVarsAndUpdateCmdEnv(t *testing.T) {
	t.Setenv("COLORTERM", "already-set")
	env := WaveshellLocalEnvVars("xterm")
	if env["TERM"] != "xterm" {
		t.Fatalf("WaveshellLocalEnvVars TERM = %#v", env)
	}
	if _, ok := env["COLORTERM"]; ok {
		t.Fatalf("WaveshellLocalEnvVars should not override COLORTERM = %#v", env)
	}

	t.Setenv("COLORTERM", "")
	env = WaveshellLocalEnvVars("")
	if env["COLORTERM"] != "truecolor" {
		t.Fatalf("WaveshellLocalEnvVars default COLORTERM = %#v", env)
	}

	cmd := exec.Command("true")
	cmd.Env = []string{"FOO=old", "BAR=keep"}
	UpdateCmdEnv(cmd, map[string]string{"FOO": "new", "BAZ": "added", "EMPTY": ""})
	found := map[string]string{}
	for _, e := range cmd.Env {
		k := GetEnvStrKey(e)
		found[k] = e
	}
	if found["FOO"] != "FOO=new" {
		t.Fatalf("FOO update = %v", found["FOO"])
	}
	if found["BAZ"] != "BAZ=added" {
		t.Fatalf("BAZ add = %v", found["BAZ"])
	}
	if found["EMPTY"] != "EMPTY=" {
		t.Fatalf("EMPTY new key = %v", found["EMPTY"])
	}
}

func TestGetEnvStrKeyNoEquals(t *testing.T) {
	if GetEnvStrKey("NOEQUALS") != "NOEQUALS" {
		t.Fatal("GetEnvStrKey no equals failed")
	}
}

func TestInitRcFilesErrorPath(t *testing.T) {
	err := InitRcFiles("/\x00bad", "/tmp/bin")
	if err == nil {
		t.Fatal("InitRcFiles bad path expected error")
	}
}

func TestEncodeEnvVarsInvalidName(t *testing.T) {
	if _, err := EncodeEnvVarsForShell(ShellType_fish, map[string]string{"bad-name": "1"}); err == nil {
		t.Fatal("EncodeEnvVarsForShell fish invalid name expected error")
	}
	if _, err := EncodeEnvVarsForShell(ShellType_pwsh, map[string]string{"bad-name": "1"}); err == nil {
		t.Fatal("EncodeEnvVarsForShell pwsh invalid name expected error")
	}
	if _, err := EncodeEnvVarsForShell("unknown", map[string]string{"A": "1"}); err == nil {
		t.Fatal("EncodeEnvVarsForShell unknown expected error")
	}
}

func TestIsExtendedZshHistoryFileExtended(t *testing.T) {
	dir := t.TempDir()
	histFile := filepath.Join(dir, ZshHistoryFileName)
	if err := os.WriteFile(histFile, []byte(": 1:cmd\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	ok, err := IsExtendedZshHistoryFile(histFile)
	if err != nil || !ok {
		t.Fatalf("IsExtendedZshHistoryFile extended = %v, %v", ok, err)
	}
}
