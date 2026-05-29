// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"io"
	"strings"
	"testing"
	"time"
)

func TestStreamToLines(t *testing.T) {
	t.Parallel()

	var lines []string
	err := StreamToLines(strings.NewReader("alpha\nbeta\n"), func(line []byte) {
		lines = append(lines, string(line))
	}, nil)
	if err != nil && err != io.EOF {
		t.Fatalf("StreamToLines: %v", err)
	}
	if len(lines) != 2 || lines[0] != "alpha" || lines[1] != "beta" {
		t.Fatalf("lines = %#v", lines)
	}
}

func TestStreamToLinesChan(t *testing.T) {
	t.Parallel()

	ch := StreamToLinesChan(strings.NewReader("one\ntwo\n"))
	got := []string{}
	for output := range ch {
		if output.Error != nil {
			t.Fatalf("StreamToLinesChan: %v", output.Error)
		}
		got = append(got, output.Line)
	}
	if len(got) != 2 || got[0] != "one" || got[1] != "two" {
		t.Fatalf("got = %#v", got)
	}
}

func TestReadLineWithTimeout(t *testing.T) {
	t.Parallel()

	ch := make(chan LineOutput, 1)
	ch <- LineOutput{Line: "ready"}
	line, err := ReadLineWithTimeout(ch, time.Second)
	if err != nil || line != "ready" {
		t.Fatalf("ReadLineWithTimeout = %q, %v", line, err)
	}

	_, err = ReadLineWithTimeout(make(chan LineOutput), 10*time.Millisecond)
	if err == nil {
		t.Fatal("expected timeout error")
	}
}
