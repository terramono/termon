// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
    vi.resetModules();
    vi.doUnmock("electron");
});

describe("fetchutil electron net", () => {
    it("delegates to electron net.fetch when available", async () => {
        const netFetch = vi.fn().mockResolvedValue(new Response("electron"));
        vi.doMock("electron", () => ({
            net: { fetch: netFetch },
        }));
        const mod = await import("./fetchutil");
        await vi.waitFor(async () => {
            await mod.fetch("https://example.com/electron", { method: "GET" });
            expect(netFetch).toHaveBeenCalledWith("https://example.com/electron", { method: "GET" });
        });
    });
});
