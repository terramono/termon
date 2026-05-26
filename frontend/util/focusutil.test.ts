// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import { findBlockId, focusedBlockId, getElemAsStr, hasSelection } from "./focusutil";

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

    it("resolves Text nodes via parent element", () => {
        const block = document.createElement("div");
        block.setAttribute("data-blockid", "block-textnode");
        const text = document.createTextNode("hello");
        block.appendChild(text);
        expect(getElemAsStr(text)).toBe("div [block-te]");
    });

    it("includes id and class on the resolved element", () => {
        const el = document.createElement("button");
        el.id = "submit";
        el.className = "primary";
        expect(getElemAsStr(el)).toBe("button#submit.primary");
    });
});

describe("hasSelection", () => {
    it("returns false when selection is collapsed", () => {
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.focus();
        input.setSelectionRange(0, 0);
        expect(hasSelection()).toBe(false);
        input.remove();
    });

    it("returns true when text is selected", () => {
        const div = document.createElement("div");
        div.textContent = "select me";
        document.body.appendChild(div);
        const range = document.createRange();
        range.selectNodeContents(div);
        const sel = document.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        expect(hasSelection()).toBe(true);
        sel?.removeAllRanges();
        div.remove();
    });
});

describe("focusedBlockId", () => {
    it("returns block id from focused element", () => {
        const block = document.createElement("div");
        block.setAttribute("data-blockid", "block-focus-1");
        const input = document.createElement("input");
        block.appendChild(input);
        document.body.appendChild(block);
        input.focus();
        expect(focusedBlockId()).toBe("block-focus-1");
        block.remove();
    });

    it("returns block id from selection anchor when focus is outside", () => {
        const block = document.createElement("div");
        block.setAttribute("data-blockid", "block-sel-1");
        const span = document.createElement("span");
        span.textContent = "text";
        block.appendChild(span);
        document.body.appendChild(block);
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = document.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        expect(focusedBlockId()).toBe("block-sel-1");
        sel?.removeAllRanges();
        block.remove();
    });

    it("returns null when no block context exists", () => {
        const el = document.createElement("span");
        document.body.appendChild(el);
        el.focus();
        expect(focusedBlockId()).toBe(null);
        el.remove();
    });
});
