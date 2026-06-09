// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

vi.mock("@/util/util", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/util/util")>();
    return {
        ...actual,
        isBlank: () => null,
    };
});

import { goHistoryBack, goHistoryForward } from "./historyutil";

describe("historyutil blank path branch", () => {
    it("returns root when isBlank is null for parent lookup", () => {
        const result = goHistoryBack("file", "anything", {}, true);
        expect(result).toEqual({ file: "/", "history:forward": ["anything"] });
    });
});

describe("goHistoryForward history trim", () => {
    it("trims history when forward navigation exceeds max length", () => {
        const longHistory = Array.from({ length: 20 }, (_, i) => `/hist/${i}`);
        const result = goHistoryForward("file", "/current", {
            history: longHistory,
            "history:forward": ["/next"],
        });
        expect(result.history.length).toBe(20);
        expect(result.history[0]).toBe("/hist/1");
        expect(result.file).toBe("/next");
    });
});
