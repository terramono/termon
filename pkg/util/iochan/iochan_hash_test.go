// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package iochan

import (
	"context"
	"errors"
	"hash"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/wavetermdev/waveterm/pkg/util/iochan/iochantypes"
	"github.com/wavetermdev/waveterm/pkg/wshrpc"
)

type failHash struct{}

func (failHash) Write([]byte) (int, error) { return 0, errors.New("hash write failed") }
func (failHash) Sum(b []byte) []byte       { return b }
func (failHash) Reset()                    {}
func (failHash) Size() int                 { return 32 }
func (failHash) BlockSize() int            { return 64 }

func TestReaderChanHashWriteError(t *testing.T) {
	t.Parallel()

	orig := newSHA256Hash
	newSHA256Hash = func() hash.Hash { return failHash{} }
	defer func() { newSHA256Hash = orig }()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := ReaderChan(ctx, strings.NewReader("hello"), 128, func() {})
	resp, ok := <-ch
	if !ok {
		t.Fatal("expected error response")
	}
	if resp.Error == nil {
		t.Fatal("expected hash write error")
	}
}

func TestWriterChanHashWriteError(t *testing.T) {
	t.Parallel()

	orig := newSHA256Hash
	newSHA256Hash = func() hash.Hash { return failHash{} }
	defer func() { newSHA256Hash = orig }()

	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{
		Response: iochantypes.Packet{Data: []byte("data")},
	}
	close(ch)

	iochanDone := make(chan struct{})
	WriterChan(ctx, io.Discard, ch, func() { close(iochanDone) }, cancel)

	select {
	case <-iochanDone:
	case <-time.After(time.Second):
		t.Fatal("WriterChan did not finish")
	}
	if ctx.Err() == nil {
		t.Fatal("expected hash write error cancel")
	}
}

func TestReaderChanContextCancel(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	_ = ReaderChan(ctx, strings.NewReader(strings.Repeat("x", 10000)), 4, func() {})
	cancel()
	time.Sleep(20 * time.Millisecond)
}
