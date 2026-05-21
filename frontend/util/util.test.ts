// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
    base64ToString,
    boundNumber,
    formatRelativeTime,
    getPrefixedSettings,
    isBlank,
    isLocalConnName,
    isSshConnName,
    isWslConnName,
    jsonDeepEqual,
    makeConnRoute,
    mergeMeta,
    parseDataUrl,
    sortByDisplayOrder,
    stringToBase64,
} from "./util";

describe("isBlank", () => {
    it("treats null, undefined, and empty string as blank", () => {
        expect(isBlank(null)).toBe(true);
        expect(isBlank(undefined)).toBe(true);
        expect(isBlank("")).toBe(true);
    });

    it("returns false for non-empty strings", () => {
        expect(isBlank("local")).toBe(false);
    });
});

describe("connection name helpers", () => {
    it("classifies local connections", () => {
        expect(isLocalConnName("")).toBe(true);
        expect(isLocalConnName("local")).toBe(true);
        expect(isLocalConnName("local:foo")).toBe(true);
        expect(isLocalConnName("user@host")).toBe(false);
    });

    it("classifies WSL connections", () => {
        expect(isWslConnName("wsl://Ubuntu")).toBe(true);
        expect(isWslConnName("local")).toBe(false);
    });

    it("classifies SSH connections", () => {
        expect(isSshConnName("deploy@prod")).toBe(true);
        expect(isSshConnName("local")).toBe(false);
        expect(isSshConnName("wsl://Ubuntu")).toBe(false);
    });
});

describe("makeConnRoute", () => {
    it("prefixes blank connection with conn:local", () => {
        expect(makeConnRoute("")).toBe("conn:local");
    });

    it("prefixes named connections", () => {
        expect(makeConnRoute("deploy@prod")).toBe("conn:deploy@prod");
    });
});

describe("boundNumber", () => {
    it("clamps values within range", () => {
        expect(boundNumber(5, 0, 10)).toBe(5);
        expect(boundNumber(-1, 0, 10)).toBe(0);
        expect(boundNumber(99, 0, 10)).toBe(10);
    });

    it("returns null for invalid numbers", () => {
        expect(boundNumber(null, 0, 10)).toBe(null);
        expect(boundNumber(Number.NaN, 0, 10)).toBe(null);
    });
});

describe("jsonDeepEqual", () => {
    it("compares nested objects and arrays", () => {
        expect(jsonDeepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
        expect(jsonDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
        expect(jsonDeepEqual([1, 2], [1])).toBe(false);
    });
});

describe("sortByDisplayOrder", () => {
    it("sorts by display:order then display:name", () => {
        const items = [
            { "display:name": "beta", "display:order": 2 },
            { "display:name": "alpha", "display:order": 1 },
            { "display:name": "gamma", "display:order": 1 },
        ];
        const sorted = [...items].sort(sortByDisplayOrder);
        expect(sorted.map((i) => i["display:name"])).toEqual(["alpha", "gamma", "beta"]);
    });
});

describe("base64 string helpers", () => {
    it("round-trips UTF-8 text", () => {
        const text = "hello 世界";
        expect(base64ToString(stringToBase64(text))).toBe(text);
    });
});

describe("parseDataUrl", () => {
    it("parses base64 data urls", () => {
        const parsed = parseDataUrl("data:text/plain;base64,aGVsbG8=");
        expect(parsed.mimeType).toBe("text/plain");
        expect(new TextDecoder().decode(parsed.buffer)).toBe("hello");
    });

    it("parses percent-encoded text data urls", () => {
        const parsed = parseDataUrl("data:text/plain,hello%20world");
        expect(new TextDecoder().decode(parsed.buffer)).toBe("hello world");
    });

    it("throws for invalid data urls", () => {
        expect(() => parseDataUrl("not-a-data-url")).toThrow("Invalid data URL");
    });
});

describe("mergeMeta", () => {
    it("merges updates and deletes null values", () => {
        const merged = mergeMeta({ a: 1, b: 2 }, { b: null, c: 3 });
        expect(merged).toEqual({ a: 1, c: 3 });
    });

    it("respects prefix filtering", () => {
        const merged = mergeMeta({ "term:font": "mono", view: "term" }, { "term:size": 12 }, "term");
        expect(merged).toEqual({ "term:font": "mono", "term:size": 12 });
        expect(merged.view).toBeUndefined();
    });

    it("clears section keys when section:* is true", () => {
        const merged = mergeMeta({ "ai:model": "gpt", "ai:provider": "openai" }, { "ai:*": true, "ai:model": "claude" });
        expect(merged).toEqual({ "ai:model": "claude" });
    });
});

describe("getPrefixedSettings", () => {
    it("returns settings matching prefix", () => {
        const settings = {
            "term:font": "mono",
            "term:size": 12,
            view: "term",
        };
        expect(getPrefixedSettings(settings, "term")).toEqual({
            "term:font": "mono",
            "term:size": 12,
        });
    });

    it("returns empty object for blank prefix", () => {
        expect(getPrefixedSettings({ a: 1 }, "")).toEqual({});
    });
});

describe("formatRelativeTime", () => {
    it("returns never for falsy timestamps", () => {
        expect(formatRelativeTime(0)).toBe("never");
    });

    it("formats recent minutes", () => {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 mins ago");
    });

    it("formats singular minute", () => {
        const oneMinuteAgo = Date.now() - 61 * 1000;
        expect(formatRelativeTime(oneMinuteAgo)).toBe("1 min ago");
    });
});
