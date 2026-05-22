// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package packetparser_test

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"github.com/wavetermdev/waveterm/pkg/baseds"
	"github.com/wavetermdev/waveterm/pkg/util/packetparser"
)

func TestParse(t *testing.T) {
	t.Parallel()

	input := "\n##N{\"type\":\"ping\"}\nraw line\n\n"
	packetCh := make(chan baseds.RpcInputChType, 2)
	rawCh := make(chan []byte, 2)

	err := packetparser.Parse(strings.NewReader(input), packetCh, rawCh)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	packet := <-packetCh
	if string(packet.MsgBytes) != `{"type":"ping"}` {
		t.Fatalf("packet: got %q", string(packet.MsgBytes))
	}

	raw := <-rawCh
	if string(raw) != "raw line\n" {
		t.Fatalf("raw: got %q", string(raw))
	}

	if _, ok := <-packetCh; ok {
		t.Fatal("expected packet channel closed")
	}
	if _, ok := <-rawCh; ok {
		t.Fatal("expected raw channel closed")
	}
}

func TestParse_EOF(t *testing.T) {
	t.Parallel()

	packetCh := make(chan baseds.RpcInputChType)
	rawCh := make(chan []byte)

	err := packetparser.Parse(strings.NewReader(""), packetCh, rawCh)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
}

func TestWritePacket(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		packet  []byte
		wantErr bool
		wantOut string
	}{
		{
			name:    "valid packet",
			packet:  []byte(`{"ok":true}`),
			wantOut: "\n##N{\"ok\":true}\n",
		},
		{
			name:    "too short skipped",
			packet:  []byte("{"),
			wantOut: "",
		},
		{
			name:    "invalid braces",
			packet:  []byte("not-json"),
			wantErr: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			var buf bytes.Buffer
			err := packetparser.WritePacket(&buf, tc.packet)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("WritePacket: %v", err)
			}
			if buf.String() != tc.wantOut {
				t.Fatalf("output: got %q want %q", buf.String(), tc.wantOut)
			}
		})
	}
}

func TestParse_invalidReader(t *testing.T) {
	t.Parallel()

	packetCh := make(chan baseds.RpcInputChType)
	rawCh := make(chan []byte)

	err := packetparser.Parse(&failReader{}, packetCh, rawCh)
	if err == nil {
		t.Fatal("expected read error")
	}
}

type failReader struct{}

func (failReader) Read([]byte) (int, error) {
	return 0, io.ErrUnexpectedEOF
}
