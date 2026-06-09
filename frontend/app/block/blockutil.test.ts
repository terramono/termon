// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { blockViewToIcon, blockViewToName, computeConnColorNum, getBlockHeaderIcon, processTitleString } from "./blockutil";

describe("blockViewToIcon", () => {
    it("maps known view types", () => {
        expect(blockViewToIcon("term")).toBe("terminal");
        expect(blockViewToIcon("preview")).toBe("file");
        expect(blockViewToIcon("web")).toBe("globe");
        expect(blockViewToIcon("waveai")).toBe("sparkles");
        expect(blockViewToIcon("processviewer")).toBe("microchip");
    });

    it("returns square for unknown views", () => {
        expect(blockViewToIcon("unknown-view")).toBe("square");
    });
});

describe("blockViewToName", () => {
    it("maps known view types", () => {
        expect(blockViewToName("term")).toBe("Terminal");
        expect(blockViewToName("preview")).toBe("Preview");
        expect(blockViewToName("waveai")).toBe("WaveAI");
    });

    it("handles blank and unknown views", () => {
        expect(blockViewToName("")).toBe("(No View)");
        expect(blockViewToName("custom")).toBe("custom");
    });
});

describe("processTitleString", () => {
    it("returns plain text segments", () => {
        const parts = processTitleString("hello world");
        expect(parts).toHaveLength(1);
        expect(parts[0]).toBe("hello world");
    });

    it("parses color tags", () => {
        const parts = processTitleString('before<c:#ff0000>red</c:after');
        expect(parts.length).toBeGreaterThan(1);
    });

    it("returns null for null input", () => {
        expect(processTitleString(null)).toBeNull();
    });
});

describe("computeConnColorNum", () => {
    it("wraps active connection numbers", () => {
        expect(computeConnColorNum({ activeconnnum: 1 })).toBe(1);
        expect(computeConnColorNum({ activeconnnum: 8 })).toBe(8);
        expect(computeConnColorNum({ activeconnnum: 9 })).toBe(1);
        expect(computeConnColorNum(null)).toBe(1);
    });
});

describe("blockViewMappings", () => {
    it("maps help and tips views", () => {
        expect(blockViewToIcon("help")).toBe("circle-question");
        expect(blockViewToIcon("tips")).toBe("lightbulb");
        expect(blockViewToName("help")).toBe("Help");
        expect(blockViewToName("tips")).toBe("Tips");
        expect(blockViewToName("web")).toBe("Web");
    });
});

describe("processTitleString tags", () => {
    it("parses icon tags in titles", () => {
        const parts = processTitleString('status<icon:terminal>ok');
        expect(parts.length).toBeGreaterThan(1);
    });

    it("parses bold and italic tags", () => {
        const parts = processTitleString("plain<b>bold</b>tail");
        expect(parts.length).toBeGreaterThan(1);
    });

    it("ignores invalid color tags", () => {
        const parts = processTitleString("bad<c:not-a-color>text</c>");
        expect(parts[0]).toBe("bad");
        expect(parts).toContain("text");
    });
});

describe("getBlockHeaderIcon", () => {
    it("returns icon element for known icon", () => {
        const elem = getBlockHeaderIcon("terminal");
        expect(elem).not.toBeNull();
    });

    it("rejects invalid override colors", () => {
        const elem = getBlockHeaderIcon("terminal", "not-a-color");
        expect(elem).not.toBeNull();
    });
});

describe("block view coverage", () => {
    it("maps sysinfo and legacy cpuplot views", () => {
        expect(blockViewToIcon("sysinfo")).toBe("chart-line");
        expect(blockViewToIcon("cpuplot")).toBe("chart-line");
        expect(blockViewToName("sysinfo")).toBe("Sysinfo");
        expect(blockViewToName("cpuplot")).toBe("Sysinfo");
    });

    it("maps processviewer and returns square for unknown views", () => {
        expect(blockViewToIcon("processviewer")).toBe("microchip");
        expect(blockViewToName("processviewer")).toBe("Processes");
        expect(blockViewToIcon("customview")).toBe("square");
        expect(blockViewToName("customview")).toBe("customview");
    });
});
