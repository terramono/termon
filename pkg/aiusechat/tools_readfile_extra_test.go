// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package aiusechat

import (
	"strings"
	"testing"
)

func TestParseReadTextFileInput_defaults(t *testing.T) {
	params, err := parseReadTextFileInput(map[string]any{
		"filename": "/tmp/example.txt",
	})
	if err != nil {
		t.Fatalf("parseReadTextFileInput failed: %v", err)
	}
	if params.Filename != "/tmp/example.txt" {
		t.Fatalf("unexpected filename: %q", params.Filename)
	}
	if *params.Origin != "start" {
		t.Fatalf("expected origin start, got %q", *params.Origin)
	}
	if *params.Offset != 0 {
		t.Fatalf("expected offset 0, got %d", *params.Offset)
	}
	if *params.Count != ReadFileDefaultLineCount {
		t.Fatalf("expected default count %d, got %d", ReadFileDefaultLineCount, *params.Count)
	}
	if *params.MaxBytes != ReadFileDefaultMaxBytes {
		t.Fatalf("expected default max bytes %d, got %d", ReadFileDefaultMaxBytes, *params.MaxBytes)
	}
}

func TestParseReadTextFileInput_validation(t *testing.T) {
	_, err := parseReadTextFileInput(map[string]any{})
	if err == nil {
		t.Fatal("expected error for missing filename")
	}

	_, err = parseReadTextFileInput(map[string]any{
		"filename": "/tmp/example.txt",
		"origin":   "middle",
	})
	if err == nil {
		t.Fatal("expected error for invalid origin")
	}

	_, err = parseReadTextFileInput(map[string]any{
		"filename": "/tmp/example.txt",
		"offset":   -1,
	})
	if err == nil {
		t.Fatal("expected error for negative offset")
	}

	_, err = parseReadTextFileInput(map[string]any{
		"filename": "/tmp/example.txt",
		"count":    0,
	})
	if err == nil {
		t.Fatal("expected error for zero count")
	}
}

func TestTruncateData_respectsLineBoundaries(t *testing.T) {
	data := "line1\nline2\nline3\nline4"
	got := truncateData(data, "start", 12)
	if got != "line1\nline2\n" {
		t.Fatalf("start truncation: got %q", got)
	}

	endData := "alpha\nbeta\ngamma\ndelta"
	gotEnd := truncateData(endData, "end", 12)
	if !strings.HasSuffix(gotEnd, "delta") {
		t.Fatalf("end truncation should keep tail, got %q", gotEnd)
	}
	if strings.Contains(gotEnd, "alpha") {
		t.Fatalf("end truncation should drop leading lines, got %q", gotEnd)
	}
}

func TestTruncateData_noTruncationWhenWithinLimit(t *testing.T) {
	data := "short"
	if truncateData(data, "start", 100) != data {
		t.Fatalf("expected unchanged data")
	}
}

func TestIsBlockedFile_sensitivePaths(t *testing.T) {
	t.Setenv("HOME", "/home/testuser")

	blocked, reason := isBlockedFile("/home/testuser/.aws/credentials")
	if !blocked || reason == "" {
		t.Fatalf("expected AWS credentials to be blocked, got blocked=%v reason=%q", blocked, reason)
	}

	blocked, _ = isBlockedFile("/home/testuser/.ssh/id_rsa")
	if !blocked {
		t.Fatal("expected SSH private key to be blocked")
	}

	blocked, _ = isBlockedFile("/home/testuser/projects/readme.txt")
	if blocked {
		t.Fatal("expected normal file to be allowed")
	}
}

func TestGetReadTextFileToolDefinition(t *testing.T) {
	toolDef := GetReadTextFileToolDefinition()
	if toolDef.Name != "read_text_file" {
		t.Fatalf("expected read_text_file tool, got %q", toolDef.Name)
	}
	if toolDef.ToolAnyCallback == nil || toolDef.ToolApproval == nil {
		t.Fatal("expected callback and approval handlers")
	}
}
