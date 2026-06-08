// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
    vi.resetModules();
    vi.doUnmock("ws");
});

describe("newWebSocket node environment", () => {
    it("uses ws package when import succeeds", async () => {
        class MockWs {
            url: string;
            headers: Record<string, string>;
            constructor(url: string, opts: { headers: Record<string, string> }) {
                this.url = url;
                this.headers = opts.headers;
            }
        }
        vi.doMock("ws", () => ({ default: MockWs }));
        const mod = await import("./wsutil");
        await vi.waitFor(async () => {
            const ws = mod.newWebSocket("ws://127.0.0.1:1", { token: "abc" }) as MockWs;
            expect(ws.url).toBe("ws://127.0.0.1:1");
            expect(ws.headers).toEqual({ token: "abc" });
        });
    });

    it("logs when ws import fails", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.doMock("ws", () => {
            throw new Error("ws unavailable");
        });
        await import("./wsutil");
        await vi.waitFor(() => {
            expect(errorSpy).toHaveBeenCalled();
        });
        errorSpy.mockRestore();
    });
});
