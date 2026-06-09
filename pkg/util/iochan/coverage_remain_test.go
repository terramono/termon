// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package iochan

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/wavetermdev/waveterm/pkg/util/iochan/iochantypes"
	"github.com/wavetermdev/waveterm/pkg/wshrpc"
)

func TestWriterChanRespError(t *testing.T) {
	t.Parallel()

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Error: errors.New("packet fail")}
	close(ch)

	ctx, cancel := context.WithCancelCause(context.Background())
	done := make(chan struct{})
	WriterChan(ctx, io.Discard, ch, func() { close(done) }, cancel)
	<-done
	if context.Cause(ctx) == nil {
		t.Fatal("WriterChan resp error expected cancel cause")
	}
}

type failWriter struct{}

func (failWriter) Write([]byte) (int, error) { return 0, errors.New("write fail") }

func TestWriterChanWriteError(t *testing.T) {
	t.Parallel()

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 1)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: []byte("x")}}
	close(ch)
	ctx, cancel := context.WithCancelCause(context.Background())
	done := make(chan struct{})
	WriterChan(ctx, failWriter{}, ch, func() { close(done) }, cancel)
	<-done
	if context.Cause(ctx) == nil {
		t.Fatal("WriterChan write error expected cancel cause")
	}
}

func TestWriterChanClosedChannel(t *testing.T) {
	t.Parallel()

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet])
	close(ch)
	done := make(chan struct{})
	ctx, cancel := context.WithCancelCause(context.Background())
	WriterChan(ctx, io.Discard, ch, func() { close(done) }, cancel)
	<-done
}

func TestWriterChanContextDoneDrains(t *testing.T) {
	t.Parallel()

	ch := make(chan wshrpc.RespOrErrorUnion[iochantypes.Packet], 2)
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: []byte("a")}}
	ch <- wshrpc.RespOrErrorUnion[iochantypes.Packet]{Response: iochantypes.Packet{Data: []byte("b")}}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	WriterChan(ctx, io.Discard, ch, func() {}, func(error) {})
	time.Sleep(20 * time.Millisecond)
}
