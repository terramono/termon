// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { applyCommand, combineFn_arrayAppend, getPath, setPath } from "./ijson";

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
});
