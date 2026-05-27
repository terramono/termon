// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeBgStyleFromMeta, formatRemoteUri, processBackgroundUrls } from "./waveutil";

vi.mock("@/util/endpoints", () => ({
    getWebServerEndpoint: () => "http://127.0.0.1:8080",
}));

describe("formatRemoteUri", () => {
    it("defaults connection to local", () => {
        expect(formatRemoteUri("/tmp/file.txt", null)).toBe("wsh://local//tmp/file.txt");
    });

    it("includes named connection", () => {
        expect(formatRemoteUri("home/docs", "deploy@prod")).toBe("wsh://deploy@prod/home/docs");
    });
});

describe("processBackgroundUrls", () => {
    it("returns null for empty input", () => {
        expect(processBackgroundUrls("")).toBe(null);
    });

    it("passes through https urls", () => {
        const css = 'url("https://example.com/bg.png")';
        expect(processBackgroundUrls(css)).toContain("https://example.com/bg.png");
    });

    it("passes through data urls", () => {
        const css = 'url("data:image/png;base64,abc")';
        expect(processBackgroundUrls(css)).toContain("data:image/png;base64,abc");
    });

    it("rejects unsafe relative urls", () => {
        expect(processBackgroundUrls('url("../secret.png")')).toBe(null);
    });

    it("rewrites absolute file paths to stream URLs", () => {
        const css = 'url("/tmp/bg.png")';
        const result = processBackgroundUrls(css);
        expect(result).toContain("http://127.0.0.1:8080/wave/stream-file");
        expect(result).toContain(encodeURIComponent("wsh://local//tmp/bg.png"));
    });

    it("rewrites file:// absolute paths", () => {
        const css = 'url("file:///tmp/bg.png")';
        const result = processBackgroundUrls(css);
        expect(result).toContain("http://127.0.0.1:8080/wave/stream-file");
    });

    it("rejects non-absolute file:// urls", () => {
        expect(processBackgroundUrls('url("file://relative.png")')).toBe(null);
    });

    it("rewrites home directory paths", () => {
        const css = 'url("~/Pictures/bg.png")';
        const result = processBackgroundUrls(css);
        expect(result).toContain("http://127.0.0.1:8080/wave/stream-file");
    });
});

describe("computeBgStyleFromMeta", () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => null);
    });

    it("returns null for blank background meta", () => {
        expect(computeBgStyleFromMeta({})).toBe(null);
    });

    it("applies opacity and blend mode from meta", () => {
        const style = computeBgStyleFromMeta({
            bg: 'url("https://example.com/bg.png")',
            "bg:opacity": 0.5,
            "bg:blendmode": "multiply",
        });
        expect(style.opacity).toBe(0.5);
        expect(style.backgroundBlendMode).toBe("multiply");
        expect(style.background).toContain("https://example.com/bg.png");
    });
});
