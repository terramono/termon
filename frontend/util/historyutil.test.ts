// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { goHistory, goHistoryBack, goHistoryForward } from "./historyutil";

describe("goHistory", () => {
    it("pushes current value onto history and clears forward stack", () => {
        const result = goHistory("file", "/a/b", "/a/c", { history: ["/root"] });
        expect(result).toEqual({
            file: "/a/c",
            history: ["/root", "/a/b"],
            "history:forward": [],
        });
    });
});

describe("goHistoryBack", () => {
    it("pops from history and pushes current to forward", () => {
        const result = goHistoryBack("file", "/a/c", { history: ["/a/b"], "history:forward": [] }, false);
        expect(result).toEqual({
            file: "/a/b",
            history: [],
            "history:forward": ["/a/c"],
        });
    });

    it("navigates to parent directory when history is empty", () => {
        const result = goHistoryBack("file", "/a/b/c", {}, true);
        expect(result).toEqual({
            file: "/a/b",
            "history:forward": ["/a/b/c"],
        });
    });

    it("returns null when already at root with empty history", () => {
        expect(goHistoryBack("file", "/", {}, true)).toBe(null);
    });
});

describe("goHistoryForward", () => {
    it("moves current value to history and restores forward entry", () => {
        const result = goHistoryForward("url", "https://a", {
            history: [],
            "history:forward": ["https://b"],
        });
        expect(result).toEqual({
            url: "https://b",
            history: ["https://a"],
            "history:forward": [],
        });
    });

    it("returns null when forward history is empty", () => {
        expect(goHistoryForward("url", "https://a", {})).toBe(null);
    });

    it("trims history to max length", () => {
        const longHistory = Array.from({ length: 20 }, (_, i) => `/path/${i}`);
        const result = goHistory("file", "/current", "/next", { history: longHistory });
        expect(result.history.length).toBe(20);
        expect(result.history[0]).toBe("/path/1");
        expect(result.history[19]).toBe("/current");
    });
});
