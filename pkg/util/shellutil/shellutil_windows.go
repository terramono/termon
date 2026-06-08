// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

//go:build windows

package shellutil

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/wavetermdev/waveterm/pkg/utilds"
	"github.com/wavetermdev/waveterm/pkg/wconfig"
)

var gitBashCache = utilds.MakeSyncCache(findInstalledGitBash)

func detectLocalShellPathOverride() string {
	if pwshPath, lpErr := exec.LookPath("pwsh"); lpErr == nil {
		return pwshPath
	}
	if powershellPath, lpErr := exec.LookPath("powershell"); lpErr == nil {
		return powershellPath
	}
	return "powershell.exe"
}

func shellPathSeparator() string {
	return ";"
}

func localWshDstPath(binDir string) string {
	return filepath.Join(binDir, "wsh.exe")
}

func FindGitBash(config *wconfig.FullConfigType, rescan bool) string {
	if config != nil && config.Settings.TermGitBashPath != "" {
		return config.Settings.TermGitBashPath
	}

	path, _ := gitBashCache.Get(rescan)
	return path
}

func findInstalledGitBash() (string, error) {
	pathEnv := os.Getenv("PATH")
	pathDirs := filepath.SplitList(pathEnv)
	for _, dir := range pathDirs {
		dir = strings.Trim(dir, `"`)
		if hasDirPart(dir, "system32") {
			continue
		}
		if !hasDirPart(dir, "git") {
			continue
		}
		bashPath := filepath.Join(dir, "bash.exe")
		if _, err := os.Stat(bashPath); err == nil {
			return bashPath, nil
		}
	}

	userProfile := os.Getenv("USERPROFILE")
	if userProfile != "" {
		scoopPath := filepath.Join(userProfile, "scoop", "apps", "git", "current", "bin", "bash.exe")
		if _, err := os.Stat(scoopPath); err == nil {
			return scoopPath, nil
		}
	}

	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData != "" {
		localPath := filepath.Join(localAppData, "programs", "git", "bin", "bash.exe")
		if _, err := os.Stat(localPath); err == nil {
			return localPath, nil
		}
	}

	programFilesPath := filepath.Join("C:\\", "Program Files", "Git", "bin", "bash.exe")
	if _, err := os.Stat(programFilesPath); err == nil {
		return programFilesPath, nil
	}

	return "", nil
}
