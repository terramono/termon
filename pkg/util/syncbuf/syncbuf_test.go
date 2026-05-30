// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package syncbuf

import (
	"io"
	"strings"
	"testing"
	"time"
)

func TestSyncBufferWriteAndString(t *testing.T) {
	t.Parallel()

	buf := MakeSyncBuffer()
	if _, err := buf.Write([]byte("hello")); err != nil {
		t.Fatalf("Write: %v", err)
	}
	if _, err := buf.Write([]byte(" world")); err != nil {
		t.Fatalf("Write: %v", err)
	}
	if got := buf.String(); got != "hello world" {
		t.Fatalf("String() = %q, want %q", got, "hello world")
	}
}

func TestMakeSyncBufferFromReader(t *testing.T) {
	t.Parallel()

	reader := strings.NewReader("async copy")
	buf := MakeSyncBufferFromReader(reader)

	deadline := time.Now().Add(2 * time.Second)
	for buf.String() == "" {
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for async copy")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if got := buf.String(); got != "async copy" {
		t.Fatalf("String() = %q, want %q", got, "async copy")
	}
}

func TestSyncBufferImplementsWriter(t *testing.T) {
	t.Parallel()

	var w io.Writer = MakeSyncBuffer()
	if _, err := w.Write([]byte("x")); err != nil {
		t.Fatalf("Write via Writer: %v", err)
	}
}
