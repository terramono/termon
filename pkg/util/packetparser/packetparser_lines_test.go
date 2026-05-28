// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package packetparser_test

import (
	"errors"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/baseds"
	"github.com/wavetermdev/waveterm/pkg/util/packetparser"
	"github.com/wavetermdev/waveterm/pkg/util/utilfn"
)

func TestParseWithLinesChan(t *testing.T) {
	t.Parallel()

	input := make(chan utilfn.LineOutput, 3)
	packetCh := make(chan baseds.RpcInputChType, 2)
	rawCh := make(chan []byte, 2)

	go func() {
		input <- utilfn.LineOutput{Line: ""}
		input <- utilfn.LineOutput{Line: `##N{"type":"ping"}`}
		input <- utilfn.LineOutput{Line: "raw line"}
		close(input)
	}()

	packetparser.ParseWithLinesChan(input, packetCh, rawCh)

	packet := <-packetCh
	if string(packet.MsgBytes) != `{"type":"ping"}` {
		t.Fatalf("packet: got %q", string(packet.MsgBytes))
	}
	raw := <-rawCh
	if string(raw) != "raw line" {
		t.Fatalf("raw: got %q", string(raw))
	}
}

func TestParseWithLinesChanReadError(t *testing.T) {
	t.Parallel()

	input := make(chan utilfn.LineOutput, 1)
	packetCh := make(chan baseds.RpcInputChType)
	rawCh := make(chan []byte)

	go func() {
		input <- utilfn.LineOutput{Error: errors.New("read failed")}
		close(input)
	}()

	packetparser.ParseWithLinesChan(input, packetCh, rawCh)
}
