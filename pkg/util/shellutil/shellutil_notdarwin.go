// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

//go:build !darwin

package shellutil

func platformGetMacUserShell() string {
	return ""
}

func platformFixupWaveZshHistory() error {
	return nil
}
