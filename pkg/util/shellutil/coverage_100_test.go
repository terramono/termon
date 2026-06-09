// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/wavebase"
)

func TestUpdateCmdEnvEmpty(t *testing.T) {
	cmd := &exec.Cmd{Env: []string{"A=1"}}
	UpdateCmdEnv(cmd, map[string]string{})
	if len(cmd.Env) != 1 {
		t.Fatalf("UpdateCmdEnv empty = %#v", cmd.Env)
	}
}

func TestGetLocalWshBinaryPathAarch64(t *testing.T) {
	path, err := GetLocalWshBinaryPath("1.0.0", "linux", "aarch64")
	if err != nil || !strings.Contains(path, "arm64") {
		t.Fatalf("path=%q err=%v", path, err)
	}
}

func TestHasWaveZshHistoryExists(t *testing.T) {
	dir := GetLocalZshZDotDir()
	if dir == "" {
		t.Skip("no wave data dir")
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	hist := filepath.Join(dir, ZshHistoryFileName)
	if err := os.WriteFile(hist, []byte("line\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	t.Cleanup(func() { os.Remove(hist) })
	has, size := HasWaveZshHistory()
	if !has || size == 0 {
		t.Fatalf("HasWaveZshHistory = %v, %d", has, size)
	}
}

func TestIsExtendedZshHistoryFileReadError(t *testing.T) {
	dir := t.TempDir()
	if ok, err := IsExtendedZshHistoryFile(dir); err == nil || ok {
		t.Fatalf("IsExtendedZshHistoryFile dir = %v, %v", ok, err)
	}
}

func TestInitRcFilesDirErrors(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "shell"), 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "shell", "zsh"), []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if err := InitRcFiles(dir, filepath.Join(dir, "bin")); err == nil {
		t.Fatal("InitRcFiles zsh file expected error")
	}
}

func TestInitRcFilesTemplateWriteErrors(t *testing.T) {
	cases := []struct {
		name     string
		failPath string
	}{
		{"zprofile", ".zprofile"},
		{"zshrc", ".zshrc"},
		{"zlogin", ".zlogin"},
		{"zshenv", ".zshenv"},
		{"bashrc", ".bashrc"},
		{"preexec", "bash_preexec.sh"},
		{"fish", "wave.fish"},
		{"pwsh", "wavepwsh.ps1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			wavebase.ResetEnsureDirCache()
			dir := t.TempDir()
			origTpl := writeTemplateToFile
			origScript := writeStartupScriptFile
			defer func() {
				writeTemplateToFile = origTpl
				writeStartupScriptFile = origScript
			}()
			writeTemplateToFile = func(path, tmpl string, params map[string]string) error {
				if strings.Contains(path, tc.failPath) && tc.failPath != "bash_preexec.sh" {
					return errors.New("write fail")
				}
				return origTpl(path, tmpl, params)
			}
			writeStartupScriptFile = func(path string, data []byte, perm os.FileMode) error {
				if strings.Contains(path, "bash_preexec.sh") && tc.failPath == "bash_preexec.sh" {
					return errors.New("write fail")
				}
				return origScript(path, data, perm)
			}
			err := InitRcFiles(dir, filepath.Join(dir, "bin"))
			if err == nil {
				t.Fatalf("InitRcFiles %s expected error", tc.name)
			}
		})
	}
}

func TestCopyLocalWshToBinErrors(t *testing.T) {
	dir := t.TempDir()
	origGet := getLocalWshBinaryPathFn
	origCopy := atomicRenameCopyFn
	defer func() {
		getLocalWshBinaryPathFn = origGet
		atomicRenameCopyFn = origCopy
	}()

	getLocalWshBinaryPathFn = func(version, goos, goarch string) (string, error) {
		return "", errors.New("unsupported")
	}
	if err := copyLocalWshToBin(dir); err != nil {
		t.Fatalf("copyLocalWshToBin missing wsh: %v", err)
	}

	src := filepath.Join(t.TempDir(), "wsh-src")
	if err := os.WriteFile(src, []byte("bin"), 0755); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	getLocalWshBinaryPathFn = func(version, goos, goarch string) (string, error) {
		return src, nil
	}
	atomicRenameCopyFn = func(dst, src string, perm os.FileMode) error {
		return errors.New("copy fail")
	}
	if err := copyLocalWshToBin(dir); err == nil {
		t.Fatal("copyLocalWshToBin copy error expected")
	}
}
