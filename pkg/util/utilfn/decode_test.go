// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package utilfn

import (
	"testing"
)

func TestDecodeDataURLBase64(t *testing.T) {
	t.Parallel()

	mimeType, data, err := DecodeDataURL("data:text/plain;base64,aGVsbG8=")
	if err != nil {
		t.Fatalf("DecodeDataURL: %v", err)
	}
	if mimeType != "text/plain" {
		t.Fatalf("mimeType = %q", mimeType)
	}
	if string(data) != "hello" {
		t.Fatalf("data = %q", string(data))
	}
}

func TestDecodeDataURLEscaped(t *testing.T) {
	t.Parallel()

	mimeType, data, err := DecodeDataURL("data:text/plain,hello%20world")
	if err != nil {
		t.Fatalf("DecodeDataURL: %v", err)
	}
	if mimeType != "text/plain" {
		t.Fatalf("mimeType = %q", mimeType)
	}
	if string(data) != "hello world" {
		t.Fatalf("data = %q", string(data))
	}
}

func TestDecodeDataURLErrors(t *testing.T) {
	t.Parallel()

	if _, _, err := DecodeDataURL("not-a-data-url"); err == nil {
		t.Fatal("expected invalid prefix error")
	}
	if _, _, err := DecodeDataURL("data:text/plain"); err == nil {
		t.Fatal("expected missing comma error")
	}
}

func TestMarshalJSONStringAndContainsBinaryData(t *testing.T) {
	t.Parallel()

	if got := MarshalJSONString(`a"b`); got != `"a\"b"` {
		t.Fatalf("MarshalJSONString = %q", got)
	}
	if !ContainsBinaryData([]byte{0x00}) {
		t.Fatal("ContainsBinaryData expected true for null byte")
	}
}
