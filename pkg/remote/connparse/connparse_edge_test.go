// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package connparse_test

import (
	"testing"

	"github.com/wavetermdev/waveterm/pkg/remote/connparse"
)

func TestConnectionGetters(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		uri            string
		wantType       string
		wantSchemePart int
		wantPathHost   string
		wantSchemeHost string
	}{
		{
			name:           "wsh local wavesrv host",
			uri:            "wsh://wavesrv/config/settings.json",
			wantType:       "wsh",
			wantSchemePart: 1,
			wantPathHost:   "wavesrv/config/settings.json",
			wantSchemeHost: "wsh://wavesrv",
		},
		{
			name:           "compound s3 profile scheme",
			uri:            "myprofile:s3://my-bucket/data/file.txt",
			wantType:       "s3",
			wantSchemePart: 2,
			wantPathHost:   "my-bucket/data/file.txt",
			wantSchemeHost: "myprofile:s3://my-bucket",
		},
		{
			name:           "wsh trailing slash preserved",
			uri:            "wsh://local/home/",
			wantType:       "wsh",
			wantSchemePart: 1,
			wantPathHost:   "local/home/",
			wantSchemeHost: "wsh://local",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, err := connparse.ParseURI(tc.uri)
			if err != nil {
				t.Fatalf("ParseURI: %v", err)
			}
			if got := c.GetType(); got != tc.wantType {
				t.Fatalf("GetType: got %q want %q", got, tc.wantType)
			}
			if got := len(c.GetSchemeParts()); got != tc.wantSchemePart {
				t.Fatalf("GetSchemeParts len: got %d want %d", got, tc.wantSchemePart)
			}
			if got := c.GetPathWithHost(); got != tc.wantPathHost {
				t.Fatalf("GetPathWithHost: got %q want %q", got, tc.wantPathHost)
			}
			if got := c.GetSchemeAndHost(); got != tc.wantSchemeHost {
				t.Fatalf("GetSchemeAndHost: got %q want %q", got, tc.wantSchemeHost)
			}
		})
	}
}

func TestParseURI_WSHRelativeParent(t *testing.T) {
	t.Parallel()

	c, err := connparse.ParseURI("../outside")
	if err != nil {
		t.Fatalf("ParseURI: %v", err)
	}
	if c.Host != connparse.ConnHostCurrent {
		t.Fatalf("host: got %q want %q", c.Host, connparse.ConnHostCurrent)
	}
	if c.Path != "../outside" {
		t.Fatalf("path: got %q want %q", c.Path, "../outside")
	}
	if c.GetFullURI() != "wsh://current/../outside" {
		t.Fatalf("full URI: got %q", c.GetFullURI())
	}
}

func TestParseURI_WSHWavesrvHost(t *testing.T) {
	t.Parallel()

	c, err := connparse.ParseURI("//wavesrv/tmp/log.txt")
	if err != nil {
		t.Fatalf("ParseURI: %v", err)
	}
	if c.Host != connparse.ConnHostWaveSrv {
		t.Fatalf("host: got %q want %q", c.Host, connparse.ConnHostWaveSrv)
	}
	if c.Path != "tmp/log.txt" {
		t.Fatalf("path: got %q want %q", c.Path, "tmp/log.txt")
	}
}

func TestParseURI_WSHEmptyHostDefaultsLocal(t *testing.T) {
	t.Parallel()

	c, err := connparse.ParseURI("wsh:///tmp/file.txt")
	if err != nil {
		t.Fatalf("ParseURI: %v", err)
	}
	if c.Host != "local" {
		t.Fatalf("host: got %q want local", c.Host)
	}
	if c.Path != "/tmp/file.txt" {
		t.Fatalf("path: got %q", c.Path)
	}
}

func TestConnectionGetPathWithHostEmptyPath(t *testing.T) {
	t.Parallel()

	c, err := connparse.ParseURI("wsh://myhost")
	if err != nil {
		t.Fatalf("ParseURI: %v", err)
	}
	if got := c.GetPathWithHost(); got != "myhost" {
		t.Fatalf("GetPathWithHost empty path: got %q", got)
	}
	if got := c.GetSchemeAndHost(); got != "wsh://myhost" {
		t.Fatalf("GetSchemeAndHost: got %q", got)
	}
}

func TestParseURI_WSHRelativeDotPath(t *testing.T) {
	t.Parallel()

	c, err := connparse.ParseURI("./relative/path")
	if err != nil {
		t.Fatalf("ParseURI: %v", err)
	}
	if c.Host != connparse.ConnHostCurrent {
		t.Fatalf("host: got %q", c.Host)
	}
	if c.Path != "./relative/path" {
		t.Fatalf("path: got %q", c.Path)
	}
}
