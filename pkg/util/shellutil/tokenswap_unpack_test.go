// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package shellutil

import "testing"

func TestUnpackSwapTokenInvalidBase64(t *testing.T) {
	t.Parallel()

	if _, err := UnpackSwapToken("!!!not-base64!!!"); err == nil {
		t.Fatal("expected base64 decode error")
	}
}

func TestUnpackSwapTokenInvalidJSON(t *testing.T) {
	t.Parallel()

	if _, err := UnpackSwapToken("dG90YWxseSBub3QganNvbg=="); err == nil {
		t.Fatal("expected json unmarshal error")
	}
}
