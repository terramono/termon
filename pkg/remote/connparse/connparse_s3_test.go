// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package connparse_test

import (
	"testing"

	"github.com/wavetermdev/waveterm/pkg/remote/connparse"
)

func TestParseURI_S3SchemeTable(t *testing.T) {
	t.Parallel()

	tests := []struct {
		uri      string
		wantType string
		wantHost string
		wantPath string
	}{
		{
			uri:      "s3://bucket-name/path/to/object",
			wantType: "s3",
			wantHost: "bucket-name",
			wantPath: "path/to/object",
		},
		{
			uri:      "profile:s3://bucket/",
			wantType: "s3",
			wantHost: "bucket",
			wantPath: "/",
		},
	}

	for _, tt := range tests {
		t.Run(tt.uri, func(t *testing.T) {
			t.Parallel()
			c, err := connparse.ParseURI(tt.uri)
			if err != nil {
				t.Fatalf("ParseURI: %v", err)
			}
			if c.GetType() != tt.wantType {
				t.Fatalf("type = %q", c.GetType())
			}
			if c.Host != tt.wantHost {
				t.Fatalf("host = %q want %q", c.Host, tt.wantHost)
			}
			if c.Path != tt.wantPath {
				t.Fatalf("path = %q want %q", c.Path, tt.wantPath)
			}
		})
	}
}
