// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package fileutil

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestApplyEditsPartial(t *testing.T) {
	t.Parallel()

	content := []byte("alpha beta gamma")
	edited, results := ApplyEditsPartial(content, []EditSpec{
		{OldStr: "beta", NewStr: "BETA"},
		{OldStr: "missing", NewStr: "x"},
	})
	if string(edited) != "alpha BETA gamma" {
		t.Fatalf("ApplyEditsPartial content = %q", string(edited))
	}
	if len(results) != 2 || !results[0].Applied || results[1].Applied {
		t.Fatalf("ApplyEditsPartial results = %#v", results)
	}
}

func TestFixPathPreservesTrailingSlash(t *testing.T) {
	t.Parallel()

	absDir, err := FixPath("./")
	if err != nil {
		t.Fatalf("FixPath ./ failed: %v", err)
	}
	if !strings.HasSuffix(absDir, string(filepath.Separator)) {
		t.Fatalf("FixPath should preserve trailing slash, got %q", absDir)
	}
}

func TestParseByteRangeOpenEnd(t *testing.T) {
	t.Parallel()

	open, err := ParseByteRange("512-")
	if err != nil {
		t.Fatalf("ParseByteRange open end: %v", err)
	}
	if !open.OpenEnd || open.Start != 512 {
		t.Fatalf("unexpected open range: %+v", open)
	}
}
