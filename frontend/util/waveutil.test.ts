// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { formatRemoteUri, processBackgroundUrls } from "./waveutil";

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
});
