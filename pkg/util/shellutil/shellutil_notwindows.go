// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

//go:build !windows

package shellutil

import (
	"path/filepath"

	"github.com/wavetermdev/waveterm/pkg/wconfig"
)

var detectLocalShellPathOverrideTest string

func detectLocalShellPathOverride() string {
	if detectLocalShellPathOverrideTest != "" {
		return detectLocalShellPathOverrideTest
	}
	return ""
}

func shellPathSeparator() string {
	return ":"
}

func localWshDstPath(binDir string) string {
	return filepath.Join(binDir, "wsh")
}

func FindGitBash(config *wconfig.FullConfigType, rescan bool) string {
	return ""
}
