// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/wavebase"
	"github.com/wavetermdev/waveterm/pkg/wconfig"
)

func TestDetectLocalShellPath(t *testing.T) {
	t.Setenv("SHELL", "/bin/bash")
	got := DetectLocalShellPath()
	if got == "" {
		t.Fatal("DetectLocalShellPath expected non-empty")
	}
	_ = GetMacUserShell()
}

func TestFindGitBash(t *testing.T) {
	if runtime.GOOS != "windows" {
		if got := FindGitBash(nil, false); got != "" {
			t.Fatalf("FindGitBash non-windows = %q", got)
		}
		return
	}
	cfg := &wconfig.FullConfigType{}
	cfg.Settings.TermGitBashPath = "C:\\Git\\bin\\bash.exe"
	if got := FindGitBash(cfg, false); got != cfg.Settings.TermGitBashPath {
		t.Fatalf("FindGitBash config = %q", got)
	}
}

func TestLocalPathHelpers(t *testing.T) {
	if got := GetLocalBashRcFileOverride(); got == "" {
		t.Fatal("GetLocalBashRcFileOverride expected path")
	}
	if got := GetLocalWavePowershellEnv(); got == "" {
		t.Fatal("GetLocalWavePowershellEnv expected path")
	}
	has, size := HasWaveZshHistory()
	if has {
		t.Fatalf("HasWaveZshHistory unexpected true size=%d", size)
	}
}

func TestInitRcFiles(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)
	dir := t.TempDir()
	if err := InitRcFiles(dir, dir); err != nil {
		t.Fatalf("InitRcFiles: %v", err)
	}
	for _, rel := range []string{
		"shell/zsh/.zprofile",
		"shell/bash/.bashrc",
		"shell/fish/wave.fish",
		"shell/pwsh/wavepwsh.ps1",
	} {
		if _, err := os.Stat(filepath.Join(dir, rel)); err != nil {
			t.Fatalf("missing %s: %v", rel, err)
		}
	}
}

func TestZInitCustomShellStartupFiles(t *testing.T) {
	if err := InitCustomShellStartupFiles(); err != nil {
		t.Logf("InitCustomShellStartupFiles: %v", err)
	}
}

func TestDetectShellTypeAndVersion(t *testing.T) {
	shellPath := "/bin/bash"
	if runtime.GOOS == "windows" {
		shellPath = "powershell.exe"
	}
	shellType, version, err := DetectShellTypeAndVersionFromPath(shellPath)
	if shellType == ShellType_unknown {
		t.Fatalf("DetectShellTypeAndVersionFromPath unknown for %q", shellPath)
	}
	_ = version
	_ = err
	_, _, _ = DetectShellTypeAndVersion()
}

func TestGetLocalWshBinaryPathUnsupportedPlatform(t *testing.T) {
	if _, err := GetLocalWshBinaryPath("0.0.0", "plan9", "m68k"); err == nil {
		t.Fatal("GetLocalWshBinaryPath unsupported expected error")
	}
}

func TestFixupWaveZshHistoryNonDarwin(t *testing.T) {
	if runtime.GOOS != "darwin" {
		if err := FixupWaveZshHistory(); err != nil {
			t.Fatalf("FixupWaveZshHistory non-darwin: %v", err)
		}
	}
}

func TestEncodeEnvVarsForShellEdgeCases(t *testing.T) {
	if got, err := EncodeEnvVarsForShell(ShellType_fish, map[string]string{"A": "1"}); err != nil || got == "" {
		t.Fatalf("EncodeEnvVarsForShell fish = %q, %v", got, err)
	}
	if got, err := EncodeEnvVarsForShell(ShellType_pwsh, map[string]string{"A": "1"}); err != nil || got == "" {
		t.Fatalf("EncodeEnvVarsForShell pwsh = %q, %v", got, err)
	}
	unpacked := &UnpackedTokenType{Token: "abc"}
	if _, err := unpacked.Pack(); err != nil {
		t.Fatalf("Pack: %v", err)
	}
}

func TestIsExtendedZshHistoryFileEdgeCases(t *testing.T) {
	dir := t.TempDir()
	missing := filepath.Join(dir, "missing")
	if ok, err := IsExtendedZshHistoryFile(missing); err != nil || ok {
		t.Fatalf("IsExtendedZshHistoryFile missing = %v, %v", ok, err)
	}
	plain := filepath.Join(dir, "plain")
	if err := os.WriteFile(plain, []byte("plain line\n"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if ok, err := IsExtendedZshHistoryFile(plain); err != nil || ok {
		t.Fatalf("IsExtendedZshHistoryFile plain = %v, %v", ok, err)
	}
}
