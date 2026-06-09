// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

//go:build darwin

package shellutil

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/wavetermdev/waveterm/pkg/util/envutil"
	"github.com/wavetermdev/waveterm/pkg/util/utilfn"
)

var (
	cachedMacUserShell string
	macUserShellOnce   = &sync.Once{}
	userShellRegexp    = regexp.MustCompile(`^UserShell: (.*)$`)
)

func platformGetMacUserShell() string {
	macUserShellOnce.Do(func() {
		cachedMacUserShell = internalMacUserShell()
	})
	return cachedMacUserShell
}

func internalMacUserShell() string {
	osUser, err := user.Current()
	if err != nil {
		return DefaultShellPath
	}
	ctx, cancelFn := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancelFn()
	userStr := "/Users/" + osUser.Username
	out, err := exec.CommandContext(ctx, "dscl", ".", "-read", userStr, "UserShell").CombinedOutput()
	if err != nil {
		return DefaultShellPath
	}
	outStr := strings.TrimSpace(string(out))
	m := userShellRegexp.FindStringSubmatch(outStr)
	if m == nil {
		return DefaultShellPath
	}
	return m[1]
}

func platformFixupWaveZshHistory() error {
	hasHistory, size := HasWaveZshHistory()
	if !hasHistory {
		return nil
	}

	zshDir := GetLocalZshZDotDir()
	waveHistFile := filepath.Join(zshDir, ZshHistoryFileName)

	if size == 0 {
		err := os.Remove(waveHistFile)
		if err != nil {
			log.Printf("error removing wave zsh history file %s: %v\n", waveHistFile, err)
		}
		return nil
	}

	log.Printf("merging wave zsh history %s into ~/.zsh_history\n", waveHistFile)

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("error getting home directory: %w", err)
	}
	realHistFile := filepath.Join(homeDir, ".zsh_history")

	isExtended, err := IsExtendedZshHistoryFile(realHistFile)
	if err != nil {
		return fmt.Errorf("error checking if history is extended: %w", err)
	}

	hasExtendedStr := "false"
	if isExtended {
		hasExtendedStr = "true"
	}

	quotedWaveHistFile := utilfn.ShellQuote(waveHistFile, true, -1)

	script := fmt.Sprintf(`
		HISTFILE=~/.zsh_history
		HISTSIZE=999999
		SAVEHIST=999999
		has_extended_history=%s
		[[ $has_extended_history == true ]] && setopt EXTENDED_HISTORY
		fc -RI
		fc -RI %s
		fc -W
	`, hasExtendedStr, quotedWaveHistFile)

	ctx, cancelFn := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelFn()

	cmd := exec.CommandContext(ctx, "zsh", "-f", "-i", "-c", script)
	cmd.Stdin = nil
	envStr := envutil.SliceToEnv(os.Environ())
	envStr = envutil.RmEnv(envStr, "ZDOTDIR")
	cmd.Env = envutil.EnvToSlice(envStr)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("error executing zsh history fixup script: %w, output: %s", err, string(output))
	}

	err = os.Remove(waveHistFile)
	if err != nil {
		log.Printf("error removing wave zsh history file %s: %v\n", waveHistFile, err)
	}
	log.Printf("successfully merged wave zsh history %s into ~/.zsh_history\n", waveHistFile)

	return nil
}
