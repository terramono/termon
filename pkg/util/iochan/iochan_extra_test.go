// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package iochan_test

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/wavetermdev/waveterm/pkg/util/iochan"
	"github.com/wavetermdev/waveterm/pkg/util/iochan/iochantypes"
	"github.com/wavetermdev/waveterm/pkg/wshrpc"
)

type failReader struct{}

func (failReader) Read([]byte) (int, error) {
	return 0, io.ErrUnexpectedEOF
}

func TestReaderChanReadError(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	callbackCalled := false
	ch := iochan.ReaderChan(ctx, failReader{}, 128, func() {
		callbackCalled = true
	})

	resp, ok := <-ch
	if !ok {
		t.Fatal("expected error response before channel close")
	}
	if resp.Error == nil {
		t.Fatal("expected read error response")
	}

	time.Sleep(10 * time.Millisecond)
	if !callbackCalled {
		t.Fatal("expected reader callback")
	}
}

func TestWriterChanChecksumMismatch(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{
		Response: iochantypes.Packet{Checksum: []byte("bad")},
	}
	close(ch)

	callbackCalled := false
	iochan.WriterChan(ctx, io.Discard, ch, func() {
		callbackCalled = true
	}, cancel)

	time.Sleep(10 * time.Millisecond)
	if ctx.Err() == nil {
		t.Fatal("expected checksum mismatch cancel")
	}
	if !callbackCalled {
		t.Fatal("expected writer callback")
	}
}
