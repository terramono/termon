// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import { newWebSocket } from "./wsutil";

describe("newWebSocket", () => {
    it("creates a browser WebSocket when Node ws is unavailable", () => {
        const ws = newWebSocket("ws://127.0.0.1:1234");
        expect(ws).toBeInstanceOf(WebSocket);
        ws.close();
    });
});
