// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

vi.mock("@/util/endpoints", () => ({
    getWebServerEndpoint: () => "http://127.0.0.1:8080",
}));

vi.mock("css-tree", async (importOriginal) => {
    const actual = await importOriginal<typeof import("css-tree")>();
    return {
        ...actual,
        parse: vi.fn(() => {
            throw new Error("parse failed");
        }),
    };
});

import { computeBgStyleFromMeta } from "./waveutil";

describe("waveutil edge cases", () => {
    it("returns null when background processing throws", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(computeBgStyleFromMeta({ bg: 'url("https://example.com/bg.png")' })).toBe(null);
        spy.mockRestore();
    });
});
