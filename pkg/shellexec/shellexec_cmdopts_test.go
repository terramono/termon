// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellexec

import (
	"reflect"
	"testing"
)

func TestAppendShellCommandOpts(t *testing.T) {
	tests := []struct {
		name     string
		cmdOpts  CommandOptsType
		wantOpts []string
	}{
		{
			name:     "plain command",
			cmdOpts:  CommandOptsType{},
			wantOpts: []string{"-c", "claude"},
		},
		{
			name:     "interactive login command",
			cmdOpts:  CommandOptsType{Interactive: true, Login: true},
			wantOpts: []string{"-l", "-i", "-c", "claude"},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := appendShellCommandOpts(nil, "claude", tc.cmdOpts)
			if !reflect.DeepEqual(got, tc.wantOpts) {
				t.Fatalf("appendShellCommandOpts() = %#v, want %#v", got, tc.wantOpts)
			}
		})
	}
}
