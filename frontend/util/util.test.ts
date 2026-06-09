// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, afterEach } from "vitest";
import { createStore } from "jotai";

import {
    arrayToBase64,
    atomWithDebounce,
    atomWithThrottle,
    base64ToArray,
    base64ToArrayBuffer,
    base64ToString,
    boundNumber,
    cn,
    countGraphemes,
    deepCompareReturnPrev,
    escapeBytes,
    fireAndForget,
    formatRelativeTime,
    getPrefixedSettings,
    getPromiseState,
    getPromiseValue,
    isBlank,
    isLocalConnName,
    isSshConnName,
    isWslConnName,
    jotaiLoadableValue,
    jsonDeepEqual,
    lazy,
    makeConnRoute,
    makeExternLink,
    makeIconClass,
    mergeMeta,
    NullAtom,
    parseDataUrl,
    sleep,
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

    it("handles primitives and mismatched types", () => {
        expect(jsonDeepEqual(1, 1)).toBe(true);
        expect(jsonDeepEqual(1, "1")).toBe(false);
        expect(jsonDeepEqual(null, undefined)).toBe(false);
        expect(jsonDeepEqual(null, {})).toBe(false);
        expect(jsonDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(jsonDeepEqual([1, 2], [1, 3])).toBe(false);
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

describe("cn", () => {
    it("merges tailwind classes with later wins", () => {
        expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });
});

describe("lazy", () => {
    it("memoizes the initializer result", () => {
        let calls = 0;
        const fn = lazy(() => {
            calls++;
            return calls;
        });
        expect(fn()).toBe(1);
        expect(fn()).toBe(1);
        expect(calls).toBe(1);
    });
});

describe("escapeBytes", () => {
    it("escapes control characters", () => {
        expect(escapeBytes("a\nb\t")).toBe("a\\nb\\t");
    });
});

describe("countGraphemes", () => {
    it("counts unicode grapheme clusters", () => {
        expect(countGraphemes("hello")).toBe(5);
        expect(countGraphemes("👋🏽")).toBe(1);
    });
});

describe("countGraphemes null input", () => {
    it("returns zero for null", () => {
        expect(countGraphemes(null)).toBe(0);
    });
});

describe("escapeBytes control characters", () => {
    it("escapes carriage return, backspace, form feed, esc, and low codes", () => {
        expect(escapeBytes("\r\b\f\x1b\x07")).toBe("\\r\\b\\f\\x1b\\x07");
    });
});

describe("mergeMeta section clearing", () => {
    it("clears unprefixed section keys when section:* is true", () => {
        const merged = mergeMeta({ ai: "old", "ai:model": "gpt" }, { "ai:*": true, ai: "new" });
        expect(merged).toEqual({ ai: "new" });
    });

    it("filters unprefixed keys when prefix is empty string", () => {
        const merged = mergeMeta({ plain: 1, "term:x": 2 }, { plain: 3 }, "");
        expect(merged).toEqual({ plain: 3 });
    });

    it("skips falsy section wildcards and unrelated prefixed keys", () => {
        expect(mergeMeta({ a: 1 }, { "term:*": false, "ai:x": 2 }, "term")).toEqual({});
        expect(mergeMeta({ a: 1, "term:x": 2 }, { ":*": true }, "")).toEqual({ a: 1 });
        expect(mergeMeta({}, { "ai:*": true }, "term")).toEqual({});
        expect(mergeMeta({ a: 1, b: 2 }, { c: 3 }, "term")).toEqual({});
    });
});

describe("makeIconClass and makeExternLink", () => {
    it("builds font-awesome class names", () => {
        expect(makeIconClass("terminal", true)).toContain("fa-terminal");
        expect(makeIconClass("solid@terminal", true)).toContain("fa-terminal");
    });

    it("builds brand, regular, and custom icon classes", () => {
        expect(makeIconClass("brands@github", false)).toContain("fa-brands fa-github");
        expect(makeIconClass("regular@star", false)).toContain("fa-regular fa-star");
        expect(makeIconClass("custom@wave", false)).toContain("fa-kit fa-wave");
    });

    it("applies animation and fw modifiers from icon suffix", () => {
        expect(makeIconClass("terminal+spin", false)).toContain("fa-spin");
        expect(makeIconClass("terminal+beat", false)).toContain("fa-beat");
        expect(makeIconClass("terminal+fade", false)).toContain("fa-fade");
        expect(makeIconClass("terminal+fw", false)).toContain("fa-fw");
    });

    it("falls back to defaultIcon for blank or invalid icons", () => {
        expect(makeIconClass("", false, { defaultIcon: "terminal" })).toContain("fa-terminal");
        expect(makeIconClass("not-valid!", false, { defaultIcon: "terminal" })).toContain("fa-terminal");
    });

    it("returns null for blank icon without default", () => {
        expect(makeIconClass("", false)).toBe(null);
        expect(makeIconClass("not-valid!", false)).toBe(null);
    });

    it("builds extern redirect links", () => {
        expect(makeExternLink("https://example.com")).toBe("https://extern?https%3A%2F%2Fexample.com");
    });
});

describe("base64ToArray", () => {
    it("decodes base64 to bytes ignoring whitespace", () => {
        expect(Array.from(base64ToArray("aGVs bG8="))).toEqual([104, 101, 108, 108, 111]);
    });
});

describe("arrayToBase64 and base64ToArrayBuffer", () => {
    it("encodes bytes to base64", () => {
        expect(arrayToBase64(new Uint8Array([104, 101, 108, 108, 111]))).toBe("aGVsbG8=");
    });

    it("decodes base64 to array buffer", () => {
        const buf = base64ToArrayBuffer("aGVsbG8=");
        expect(new TextDecoder().decode(buf)).toBe("hello");
    });
});

describe("base64ToString edge cases", () => {
    it("returns null for null input", () => {
        expect(base64ToString(null)).toBe(null);
    });

    it("returns empty string for empty input", () => {
        expect(base64ToString("")).toBe("");
    });
});

describe("deepCompareReturnPrev", () => {
    it("returns previous value when deep equal", () => {
        const key = {};
        const first = { a: 1 };
        const second = { a: 1 };
        const cached = deepCompareReturnPrev(key, first);
        expect(deepCompareReturnPrev(key, second)).toBe(cached);
    });

    it("returns new value when not equal", () => {
        const key = {};
        deepCompareReturnPrev(key, { a: 1 });
        expect(deepCompareReturnPrev(key, { a: 2 })).toEqual({ a: 2 });
    });

    it("returns new value when key is null", () => {
        expect(deepCompareReturnPrev(null, { a: 1 })).toEqual({ a: 1 });
    });
});

describe("fireAndForget", () => {
    it("runs async work without throwing", async () => {
        let resolved = false;
        fireAndForget(async () => {
            resolved = true;
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(resolved).toBe(true);
    });

    it("swallows rejected promises", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        fireAndForget(async () => {
            throw new Error("boom");
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});

describe("getPromiseState and getPromiseValue", () => {
    it("tracks pending then resolved promise state", async () => {
        let resolveFn: (v: string) => void;
        const promise = new Promise<string>((resolve) => {
            resolveFn = resolve;
        });
        const [, pending] = getPromiseState(promise);
        expect(pending).toBe(true);
        resolveFn!("done");
        await promise;
        const [value, pendingAfter] = getPromiseState(promise);
        expect(pendingAfter).toBe(false);
        expect(value).toBe("done");
    });

    it("returns default while pending or on error", async () => {
        const pendingPromise = new Promise<string>(() => {});
        expect(getPromiseValue(pendingPromise, "default")).toBe("default");

        const rejectedPromise = Promise.reject(new Error("fail"));
        await rejectedPromise.catch(() => {});
        expect(getPromiseValue(rejectedPromise, "default")).toBe("default");
    });

    it("returns resolved promise value", async () => {
        const resolvedPromise = Promise.resolve("ok");
        getPromiseState(resolvedPromise);
        await resolvedPromise;
        expect(getPromiseValue(resolvedPromise, "default")).toBe("ok");
    });

    it("returns null state for null promise", () => {
        expect(getPromiseState(null)).toEqual([null, false, null]);
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

    it("formats hours and days", () => {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        expect(formatRelativeTime(twoHoursAgo)).toBe("2 hrs ago");

        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("formats older timestamps as locale date", () => {
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        expect(formatRelativeTime(twoWeeksAgo)).toBe(new Date(twoWeeksAgo).toLocaleDateString());
    });

    it("returns Just now for sub-minute timestamps", () => {
        const thirtySecondsAgo = Date.now() - 30 * 1000;
        expect(formatRelativeTime(thirtySecondsAgo)).toBe("Just now");
    });
});

describe("atomWithDebounce", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("debounces value propagation", () => {
        vi.useFakeTimers();
        const store = createStore();
        const { currentValueAtom, debouncedValueAtom } = atomWithDebounce("start", 100);
        store.set(debouncedValueAtom, "updated");
        expect(store.get(currentValueAtom)).toBe("updated");
        expect(store.get(debouncedValueAtom)).toBe("start");
        vi.advanceTimersByTime(100);
        expect(store.get(debouncedValueAtom)).toBe("updated");
    });
});

describe("jotaiLoadableValue", () => {
    it("returns data or default based on loadable state", () => {
        expect(jotaiLoadableValue({ state: "hasData", data: "ok" }, "def")).toBe("ok");
        expect(jotaiLoadableValue({ state: "loading" }, "def")).toBe("def");
    });
});

describe("sleep", () => {
    it("resolves after the requested delay", async () => {
        vi.useFakeTimers();
        const promise = sleep(50);
        vi.advanceTimersByTime(50);
        await promise;
        vi.useRealTimers();
    });
});

describe("NullAtom", () => {
    it("is a null atom", () => {
        const store = createStore();
        expect(store.get(NullAtom)).toBeNull();
    });
});

describe("atomWithThrottle", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("throttles value propagation", () => {
        vi.useFakeTimers();
        const store = createStore();
        const { currentValueAtom, throttledValueAtom } = atomWithThrottle("start", 100);
        store.set(throttledValueAtom, "first");
        store.set(throttledValueAtom, "second");
        expect(store.get(currentValueAtom)).toBe("second");
        vi.advanceTimersByTime(100);
        expect(store.get(throttledValueAtom)).toBe("second");
    });
});
