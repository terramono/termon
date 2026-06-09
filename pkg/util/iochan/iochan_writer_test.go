// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package iochan_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/wavetermdev/waveterm/pkg/util/iochan"
	"github.com/wavetermdev/waveterm/pkg/util/iochan/iochantypes"
	"github.com/wavetermdev/waveterm/pkg/wshrpc"
)

type hashFailWriter struct{}

func (hashFailWriter) Write([]byte) (int, error) { return 0, errors.New("write failed") }

func TestWriterChanSuccessAndCancel(t *testing.T) {
	t.Parallel()

	data := []byte("payload")
	sum := sha256.Sum256(data)
	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 2)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: data}}
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Checksum: sum[:]}}
	close(ch)

	var buf bytes.Buffer
	done := make(chan struct{})
	ctx, cancel := context.WithCancelCause(context.Background())
	iochan.WriterChan(ctx, &buf, ch, func() { close(done) }, cancel)
	<-done
	if buf.String() != string(data) {
		t.Fatalf("WriterChan output = %q", buf.String())
	}

	ctx2, cancel2 := context.WithCancel(context.Background())
	ch2 := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch2 <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: []byte("x")}}
	cancel2()
	iochan.WriterChan(ctx2, io.Discard, ch2, func() {}, func(error) {})
	time.Sleep(10 * time.Millisecond)
}

func TestWriterChanWriteAndHashErrors(t *testing.T) {
	t.Parallel()

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: []byte("x")}}
	close(ch)
	ctx, cancel := context.WithCancelCause(context.Background())
	iochan.WriterChan(ctx, hashFailWriter{}, ch, func() {}, cancel)
	time.Sleep(10 * time.Millisecond)
	if context.Cause(ctx) == nil {
		t.Fatal("WriterChan write error expected cancel cause")
	}
}

func TestReaderChanContextDone(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	ch := iochan.ReaderChan(ctx, bytes.NewReader([]byte("data")), 8, func() {})
	for range ch {
	}
}
