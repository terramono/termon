// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import (
	"os"
	"strings"
	"testing"
)

func TestDetectShellTypeAndVersionFromPath_Bash(t *testing.T) {
	t.Parallel()

	if _, err := os.Stat("/bin/bash"); err != nil {
		t.Skip("no /bin/bash")
	}

	shellType, version, err := DetectShellTypeAndVersionFromPath("/bin/bash")
	if err != nil {
		t.Fatalf("DetectShellTypeAndVersionFromPath: %v", err)
	}
	if shellType != ShellType_bash {
		t.Fatalf("shellType = %q, want %q", shellType, ShellType_bash)
	}
	if version == "" || !strings.Contains(version, ".") {
		t.Fatalf("version = %q", version)
	}
}

func TestDetectShellTypeAndVersionFromPath_Unknown(t *testing.T) {
	t.Parallel()

	shellType, version, err := DetectShellTypeAndVersionFromPath("/usr/bin/false-shell")
	if err == nil {
		t.Fatal("expected error for unknown shell")
	}
	if shellType != ShellType_unknown {
		t.Fatalf("shellType = %q", shellType)
	}
	if version != "" {
		t.Fatalf("version = %q, want empty", version)
	}
}

func TestGetShellTypeFromShellPath_PowerShellLegacy(t *testing.T) {
	t.Parallel()

	if got := GetShellTypeFromShellPath("/usr/bin/powershell"); got != ShellType_pwsh {
		t.Fatalf("got %q", got)
	}
}
