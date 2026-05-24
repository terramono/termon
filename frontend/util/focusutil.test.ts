// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import { findBlockId, getElemAsStr } from "./focusutil";

describe("findBlockId", () => {
    it("walks ancestors to find data-blockid", () => {
        const block = document.createElement("div");
        block.setAttribute("data-blockid", "block-abc12345");
        const inner = document.createElement("span");
        block.appendChild(inner);
        expect(findBlockId(inner)).toBe("block-abc12345");
    });

    it("returns null when no block ancestor exists", () => {
        const el = document.createElement("span");
        expect(findBlockId(el)).toBe(null);
    });
});

describe("getElemAsStr", () => {
    it("formats element tag, id, class, and truncated block id", () => {
        const block = document.createElement("div");
        block.id = "main";
        block.className = "panel";
        block.setAttribute("data-blockid", "block-abcdefgh");
        const inner = document.createElement("span");
        block.appendChild(inner);
        expect(getElemAsStr(inner)).toBe("span [block-ab]");
    });

    it("returns null for null input", () => {
        expect(getElemAsStr(null)).toBe("null");
    });

    it("returns unknown for non-element targets", () => {
        expect(getElemAsStr({} as EventTarget)).toBe("unknown");
    });
});
