// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { transformBlocks } from "./markdown-util";

describe("transformBlocks", () => {
    it("extracts block content between start and end markers", () => {
        const input = [
            "before",
            '@@@start chart "chart-1" {"width":100}',
            "line 1",
            "line 2",
            '@@@end chart "chart-1"',
            "after",
        ].join("\n");

        const { content, blocks } = transformBlocks(input);
        expect(content).toBe('before\n!!!chart["chart-1"]!!!\nafter');
        expect(blocks.get('chart["chart-1"]')).toEqual({
            type: "chart",
            id: '"chart-1"',
            opts: { width: 100 },
            content: "line 1\nline 2",
        });
    });

    it("leaves invalid markers as plain content", () => {
        const input = "@@@start bad\nstill content";
        const { content, blocks } = transformBlocks(input);
        expect(content).toBe(input);
        expect(blocks.size).toBe(0);
    });

    it("handles unclosed blocks at EOF", () => {
        const input = ['@@@start note "n1"', "body line"].join("\n");
        const { content, blocks } = transformBlocks(input);
        expect(content).toBe('!!!note["n1"]!!!');
        expect(blocks.get('note["n1"]')?.content).toBe("body line");
    });

    it("treats mismatched end markers as block content", () => {
        const input = ['@@@start note "n1"', '@@@end chart "n1"', "tail"].join("\n");
        const { blocks } = transformBlocks(input);
        expect(blocks.get('note["n1"]')?.content).toBe('@@@end chart "n1"\ntail');
    });
});
