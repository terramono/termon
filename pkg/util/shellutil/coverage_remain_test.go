// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/wavebase"
)

func TestDetectLocalShellPathPlatformOverride(t *testing.T) {
	detectLocalShellPathOverrideTest = "/bin/fish"
	t.Cleanup(func() { detectLocalShellPathOverrideTest = "" })
	if got := DetectLocalShellPath(); got != "/bin/fish" {
		t.Fatalf("DetectLocalShellPath platform override = %q", got)
	}
}

func TestDetectLocalShellPathTestOverride(t *testing.T) {
	localShellPathTestOverride = "/bin/zsh"
	t.Cleanup(func() { localShellPathTestOverride = "" })
	if got := DetectLocalShellPath(); got != "/bin/zsh" {
		t.Fatalf("DetectLocalShellPath override = %q", got)
	}
}

func TestDetectShellTypeAndVersionPowerShellLegacy(t *testing.T) {
	shellType, version, err := DetectShellTypeAndVersionFromPath("/usr/bin/powershell")
	if err != nil || shellType != "powershell" || version != "" {
		t.Fatalf("powershell legacy = %q, %q, %v", shellType, version, err)
	}
}

func TestGetShellVersionUnsupportedType(t *testing.T) {
	if _, err := getShellVersion("/bin/bash", "not-a-shell"); err == nil {
		t.Fatal("getShellVersion unsupported expected error")
	}
}

func TestInitRcFilesIntegrationDirErrors(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)

	cases := []struct {
		name    string
		blocker string
	}{
		{"bash", BashIntegrationDir},
		{"fish", FishIntegrationDir},
		{"pwsh", PwshIntegrationDir},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.MkdirAll(filepath.Join(dir, "shell"), 0755); err != nil {
				t.Fatalf("MkdirAll: %v", err)
			}
			blockPath := filepath.Join(dir, tc.blocker)
			if err := os.WriteFile(blockPath, []byte("x"), 0644); err != nil {
				t.Fatalf("WriteFile: %v", err)
			}
			if err := InitRcFiles(dir, filepath.Join(dir, "bin")); err == nil {
				t.Fatalf("InitRcFiles %s blocked expected error", tc.name)
			}
		})
	}
}

func TestInitRcFilesCacheEnsureDirError(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)

	orig := initRcFilesCacheEnsureDirFn
	defer func() { initRcFilesCacheEnsureDirFn = orig }()
	initRcFilesCacheEnsureDirFn = func(dirName string, cacheKey string, perm os.FileMode, dirDesc string) error {
		return errors.New("cache ensure fail")
	}
	if err := InitRcFiles(t.TempDir(), "/tmp/bin"); err == nil {
		t.Fatal("InitRcFiles cache ensure error expected")
	}
}

func TestInitCustomShellStartupFilesInternalBinDirError(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)

	orig := initRcFilesCacheEnsureDirFn
	defer func() { initRcFilesCacheEnsureDirFn = orig }()
	calls := 0
	initRcFilesCacheEnsureDirFn = func(dirName string, cacheKey string, perm os.FileMode, dirDesc string) error {
		calls++
		if cacheKey == WaveHomeBinDir {
			return errors.New("bin dir fail")
		}
		return wavebase.CacheEnsureDir(dirName, cacheKey, perm, dirDesc)
	}
	if err := initCustomShellStartupFilesInternal(); err == nil {
		t.Fatal("initCustomShellStartupFilesInternal bin error expected")
	}
}

func TestUnpackedTokenPackMarshalError(t *testing.T) {
	orig := unpackedTokenMarshal
	unpackedTokenMarshal = func(any) ([]byte, error) {
		return nil, errors.New("marshal fail")
	}
	defer func() { unpackedTokenMarshal = orig }()

	_, err := (&UnpackedTokenType{Token: "t"}).Pack()
	if err == nil {
		t.Fatal("Pack marshal error expected")
	}
}

func TestIsExtendedZshHistoryFilePermissionError(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "hist")
	if err := os.WriteFile(path, []byte("x"), 0000); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if ok, err := IsExtendedZshHistoryFile(path); err == nil || ok {
		t.Fatalf("IsExtendedZshHistoryFile permission = %v, %v", ok, err)
	}
}

func TestInitCustomShellStartupFilesInternalInitRcError(t *testing.T) {
	wavebase.ResetEnsureDirCache()
	t.Cleanup(wavebase.ResetEnsureDirCache)

	orig := initRcFilesCacheEnsureDirFn
	defer func() { initRcFilesCacheEnsureDirFn = orig }()
	initRcFilesCacheEnsureDirFn = func(dirName string, cacheKey string, perm os.FileMode, dirDesc string) error {
		if cacheKey == ZshIntegrationDir {
			return errors.New("init rc fail")
		}
		return wavebase.CacheEnsureDir(dirName, cacheKey, perm, dirDesc)
	}
	if err := initCustomShellStartupFilesInternal(); err == nil {
		t.Fatal("initCustomShellStartupFilesInternal InitRcFiles error expected")
	}
}

func TestGetShellVersionCommandError(t *testing.T) {
	if _, err := getShellVersion("/definitely/missing/shell", ShellType_bash); err == nil {
		t.Fatal("getShellVersion missing shell expected error")
	}
}

func TestGetShellVersionParseError(t *testing.T) {
	dir := t.TempDir()
	script := filepath.Join(dir, "fakebash")
	if err := os.WriteFile(script, []byte("#!/bin/sh\necho not-a-version\n"), 0755); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := getShellVersion(script, ShellType_bash); err == nil {
		t.Fatal("getShellVersion parse error expected")
	}
}

func TestDetectShellTypeAndVersionError(t *testing.T) {
	if _, _, err := DetectShellTypeAndVersionFromPath("/unknown/shell"); err == nil {
		t.Fatal("DetectShellTypeAndVersionFromPath unknown expected error")
	}
}

func TestDetectShellTypeAndVersionFromPathVersionError(t *testing.T) {
	dir := t.TempDir()
	script := filepath.Join(dir, "bash")
	if err := os.WriteFile(script, []byte("#!/bin/sh\necho bad-output\n"), 0755); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, _, err := DetectShellTypeAndVersionFromPath(script); err == nil {
		t.Fatal("DetectShellTypeAndVersionFromPath version error expected")
	}
}

func TestUnpackedTokenPackSuccess(t *testing.T) {
	orig := unpackedTokenMarshal
	defer func() { unpackedTokenMarshal = orig }()
	unpackedTokenMarshal = json.Marshal

	got, err := (&UnpackedTokenType{Token: "abc"}).Pack()
	if err != nil || got == "" {
		t.Fatalf("Pack = %q, %v", got, err)
	}
}
