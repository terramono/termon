// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestLoadPTLocFallback(t *testing.T) {
	orig := timeLoadLocation
	timeLoadLocation = func(string) (*time.Location, error) {
		return nil, errors.New("bad tz")
	}
	defer func() { timeLoadLocation = orig }()

	loc := loadPTLoc()
	if loc == nil || loc.String() != "PT" {
		t.Fatalf("loadPTLoc fallback = %v", loc)
	}
}

func TestSetValueNilAndAssignable(t *testing.T) {
	type sample struct {
		Name string
		N    int
	}
	var s sample
	if err := setValue(reflect.ValueOf(&s.Name).Elem(), nil); err != nil {
		t.Fatalf("setValue nil: %v", err)
	}
	if err := setValue(reflect.ValueOf(&s.N).Elem(), int64(3)); err != nil {
		t.Fatalf("setValue convert: %v", err)
	}
}

func TestDrainChannelSafeDrains(t *testing.T) {
	ch := make(chan int, 2)
	ch <- 1
	ch <- 2
	close(ch)
	DrainChannelSafe(ch, "drain-test")
}

func TestStreamToLinesProcessBufNewline(t *testing.T) {
	var got []string
	var lb lineBuf
	streamToLines_processBuf(&lb, []byte("line1\nline2\n"), func(b []byte) {
		got = append(got, string(b))
	})
	if len(got) != 2 {
		t.Fatalf("lines = %#v", got)
	}
}

func TestAtomicRenameCopyCreateError(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "src.txt")
	blocker := filepath.Join(dir, "blocker")
	if err := os.WriteFile(src, []byte("x"), 0644); err != nil {
		t.Fatalf("WriteFile src: %v", err)
	}
	if err := os.Mkdir(blocker, 0500); err != nil {
		t.Fatalf("Mkdir blocker: %v", err)
	}
	if err := AtomicRenameCopy(filepath.Join(blocker, "dst.txt"), src, 0644); err == nil {
		t.Fatal("AtomicRenameCopy blocked dst expected error")
	}
}
