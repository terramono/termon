// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
    applyCommand,
    combineFn_arrayAppend,
    formatPath,
    getPath,
    isEmpty,
    setPath,
    setPathInternal,
} from "./ijson";

describe("getPath", () => {
    it("reads nested object and array paths", () => {
        const data = { user: { name: "alice" }, items: ["a", "b"] };
        expect(getPath(data, ["user", "name"])).toBe("alice");
        expect(getPath(data, ["items", 1])).toBe("b");
    });

    it("returns null or undefined for missing paths", () => {
        expect(getPath({ a: 1 }, ["b"])).toBeUndefined();
        expect(getPath({ items: [1] }, ["items", 5])).toBeUndefined();
    });
});

describe("setPath", () => {
    it("sets nested values creating objects as needed", () => {
        const result = setPath({}, ["a", "b"], 42, {});
        expect(result).toEqual({ a: { b: 42 } });
    });

    it("removes keys when remove option is set", () => {
        const result = setPath({ a: { b: 1, c: 2 } }, ["a", "b"], null, { remove: true });
        expect(result).toEqual({ a: { c: 2 } });
    });

    it("throws when setting value and remove together", () => {
        expect(() => setPath({}, ["a"], 1, { remove: true, force: false })).toThrow(
            "Cannot set value and remove at the same time"
        );
    });
});

describe("combineFn_arrayAppend", () => {
    it("creates array when old value is null", () => {
        expect(combineFn_arrayAppend(null, "x", {})).toEqual(["x"]);
    });

    it("appends to existing array", () => {
        const arr = ["a"];
        expect(combineFn_arrayAppend(arr, "b", {})).toEqual(["a", "b"]);
    });
});

describe("applyCommand", () => {
    it("applies set, del, and append commands", () => {
        let data = { count: 1, tags: ["a"] };

        data = applyCommand(data, { type: "set", path: ["count"], value: 2 });
        expect(data.count).toBe(2);

        data = applyCommand(data, { type: "append", path: ["tags"], value: "b" });
        expect(data.tags).toEqual(["a", "b"]);

        data = applyCommand(data, { type: "del", path: ["count"] });
        expect(data).toEqual({ tags: ["a", "b"] });
    });

    it("throws for invalid commands", () => {
        expect(() => applyCommand({}, null)).toThrow("Invalid command (null)");
        expect(() => applyCommand({}, { type: "noop" })).toThrow("Invalid command type: noop");
        expect(() => applyCommand({}, { path: ["a"], value: 1 })).toThrow("Invalid command (no type)");
        expect(() => applyCommand({}, "bad")).toThrow("Invalid command (not an object)");
    });

    it("rejects invalid command paths", () => {
        expect(() => applyCommand({}, { type: "set", path: [null], value: 1 })).toThrow("Invalid command path");
    });
});

describe("setPath edge cases", () => {
    it("sets array indices and removes array elements", () => {
        const result = setPath({ items: ["a", "b", "c"] }, ["items", 1], null, { remove: true });
        expect(result).toEqual({ items: ["a", null, "c"] });
    });

    it("replaces root value with empty path", () => {
        expect(setPath({ old: true }, [], { new: true }, {})).toEqual({ new: true });
    });

    it("uses force to replace non-object targets", () => {
        expect(setPath("text", ["a"], 1, { force: true })).toEqual({ a: 1 });
    });

    it("throws on invalid path parts", () => {
        expect(() => setPath({}, [Symbol("x") as any], 1, {})).toThrow("Invalid path");
    });

    it("throws when appending to non-array without force", () => {
        expect(() => combineFn_arrayAppend("not-array", "x", {})).toThrow("Cannot append to non-array");
    });
});

describe("getPath edge cases", () => {
    it("returns null when traversing through null", () => {
        expect(getPath({ a: null }, ["a", "b"])).toBeNull();
    });

    it("returns null when indexing non-array", () => {
        expect(getPath({ a: { b: 1 } }, ["a", 0])).toBeNull();
    });

    it("returns null when traversing non-object with string key", () => {
        expect(getPath({ a: [1] }, ["a", "b"])).toBeNull();
    });

    it("throws for invalid path part types", () => {
        expect(() => getPath({ a: 1 }, [null as any])).toThrow("Invalid path part");
    });
});

describe("setPath additional cases", () => {
    it("defaults opts to empty object", () => {
        expect(setPath({}, ["a"], 1, null)).toEqual({ a: 1 });
    });

    it("defaults path to empty array when null", () => {
        expect(setPath({ old: true }, null, { new: true }, {})).toEqual({ new: true });
    });

    it("removes object keys and collapses empty parents", () => {
        expect(setPath({ a: { b: 1 } }, ["a"], null, { remove: true })).toBeNull();
    });

    it("removes nested keys and collapses empty parents", () => {
        expect(setPath({ a: { b: 1, c: 2 } }, ["a", "b"], null, { remove: true })).toEqual({ a: { c: 2 } });
    });

    it("removes array elements at end and collapses empty array", () => {
        expect(setPath({ items: ["only"] }, ["items", 0], null, { remove: true })).toBeNull();
    });

    it("removes array elements before last index", () => {
        expect(setPath({ items: ["a", "b", "c"] }, ["items", 0], null, { remove: true })).toEqual({
            items: [null, "b", "c"],
        });
    });

    it("creates arrays for numeric path parts", () => {
        expect(setPath(null, [0, "a"], 1, {})).toEqual([{ a: 1 }]);
    });

    it("throws for negative or non-integer array indices", () => {
        expect(() => setPath([], [-1], 1, {})).toThrow("Invalid path part");
        expect(() => setPath([], [1.5], 1, {})).toThrow("Invalid path part");
    });

    it("throws when setting on non-object without force", () => {
        expect(() => setPath(42, ["a"], 1, {})).toThrow("Cannot set path on non-object");
    });

    it("throws when setting on non-array without force", () => {
        expect(() => setPath("text", [0], 1, {})).toThrow("Cannot set path on non-array");
    });

    it("force-replaces non-array targets for numeric paths", () => {
        expect(setPath("text", [0], 1, { force: true })).toEqual([1]);
    });

    it("skips remove on null root for object paths", () => {
        expect(setPath(null, ["a"], null, { remove: true })).toBeNull();
    });

    it("skips remove on null root for array paths", () => {
        expect(setPath(null, [0], null, { remove: true })).toBeNull();
    });

    it("uses combinefn at root for append semantics", () => {
        expect(setPath(["a"], [], "b", { combinefn: combineFn_arrayAppend })).toEqual(["a", "b"]);
    });

    it("force-replaces non-array when appending", () => {
        expect(combineFn_arrayAppend("text", "x", { force: true })).toEqual(["x"]);
    });
});

describe("formatPath", () => {
    it("formats root empty and mixed path segments", () => {
        expect(formatPath([])).toBe("$");
        expect(formatPath(["alpha", "beta-key", 2])).toBe('$.alpha["beta-key"][2]');
    });
});

describe("applyCommand path formatting", () => {
    it("accepts paths with special key names", () => {
        const data = applyCommand({}, { type: "set", path: ["weird-key"], value: 1 });
        expect(data["weird-key"]).toBe(1);
    });

    it("formats invalid paths in error messages", () => {
        expect(() => applyCommand({}, { type: "set", path: ["valid", true as any], value: 1 })).toThrow(
            "Invalid command path"
        );
        expect(() => setPath({}, [true as any], 1, {})).toThrow("Invalid path");
        expect(() => setPath({}, 42 as any, 1, {})).toThrow();
        expect(() => setPath({}, ["a", null as any], 1, {})).toThrow("Invalid path");
    });
});

describe("setPath isEmpty and removeFromArr branches", () => {
    it("collapses empty objects on nested remove", () => {
        expect(setPath({ a: { b: { c: 1 } } }, ["a", "b"], null, { remove: true })).toBeNull();
    });

    it("removes nested array entries via removeFromArr", () => {
        expect(setPath({ items: ["a", "b", "c"] }, ["items", 1], null, { remove: true })).toEqual({
            items: ["a", null, "c"],
        });
    });

    it("collapses array to null when removing last element", () => {
        expect(setPath({ items: ["only"] }, ["items", 0], null, { remove: true })).toBeNull();
    });

    it("ignores remove when array index is out of range", () => {
        expect(setPath({ items: ["a"] }, ["items", 5], null, { remove: true })).toEqual({ items: ["a"] });
    });

    it("treats non-collection values as empty for collapse checks", () => {
        expect(setPath({ a: 42 }, ["a"], null, { remove: true })).toBeNull();
    });

    it("throws for invalid internal path part types", () => {
        expect(() => setPath({}, [Symbol("bad") as any, "a"], 1, {})).toThrow("Invalid path");
    });

    it("formats numeric path segments in invalid path errors", () => {
        expect(() => setPath({}, [0, true as any], 1, {})).toThrow("Invalid path");
    });

    it("keeps sibling keys when nested remove collapses empty parents", () => {
        expect(setPath({ a: { b: 1 }, keep: 1 }, ["a", "b"], null, { remove: true })).toEqual({
            keep: 1,
        });
    });

    it("removes nested array values via removeFromArr", () => {
        expect(setPath({ items: [{ a: 1 }] }, ["items", 0, "a"], null, { remove: true })).toBeNull();
    });

    it("pops non-final array elements with remove", () => {
        expect(setPath({ items: ["a", "b"] }, ["items", 1], null, { remove: true })).toEqual({ items: ["a"] });
    });
});

describe("isEmpty", () => {
    it("treats nullish and empty collections as empty", () => {
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(undefined)).toBe(true);
        expect(isEmpty([])).toBe(true);
        expect(isEmpty({})).toBe(true);
    });

    it("treats non-empty collections and primitives as non-empty", () => {
        expect(isEmpty({ a: 1 })).toBe(false);
        expect(isEmpty([1])).toBe(false);
        expect(isEmpty(0)).toBe(false);
        expect(isEmpty("text")).toBe(false);
    });
});

describe("setPathInternal", () => {
    it("throws for invalid path part types", () => {
        expect(() => setPathInternal({}, [true as any], 1, {})).toThrow("Invalid path part");
    });
});
