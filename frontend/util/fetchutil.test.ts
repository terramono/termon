// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { fetch as fetchUtil } from "./fetchutil";

describe("fetchutil", () => {
    it("delegates to global fetch when electron net is unavailable", async () => {
        const response = new Response("ok");
        const fetchMock = vi.fn().mockResolvedValue(response);
        vi.stubGlobal("fetch", fetchMock);
        const result = await fetchUtil("https://example.com/test");
        expect(fetchMock).toHaveBeenCalledWith("https://example.com/test", undefined);
        expect(result).toBe(response);
        vi.unstubAllGlobals();
    });

});
