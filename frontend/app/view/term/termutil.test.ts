// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { computeTheme, normalizeCursorStyle } from "./termutil";

describe("normalizeCursorStyle", () => {
    it("passes through underline and bar", () => {
        expect(normalizeCursorStyle("underline")).toBe("underline");
        expect(normalizeCursorStyle("bar")).toBe("bar");
    });

    it("defaults unknown styles to block", () => {
        expect(normalizeCursorStyle("beam")).toBe("block");
        expect(normalizeCursorStyle("")).toBe("block");
    });
});

describe("computeTheme", () => {
    const fullConfig = {
        termthemes: {
            "default-dark": {
                background: "#1e1e1e",
                foreground: "#cccccc",
                selectionBackground: "#264f78",
            },
            custom: {
                background: "#000000",
                foreground: "#ffffff",
            },
        },
    } as FullConfigType;

    it("returns theme copy with transparent background and original bgcolor", () => {
        const [theme, bgcolor] = computeTheme(fullConfig, "custom", null);
        expect(bgcolor).toBe("#000000");
        expect(theme.background).toBe("#00000000");
        expect(theme.foreground).toBe("#ffffff");
    });

    it("falls back to default-dark when theme is missing", () => {
        const [theme, bgcolor] = computeTheme(fullConfig, "missing", null);
        expect(bgcolor).toBe("#1e1e1e");
        expect(theme.foreground).toBe("#cccccc");
    });

    it("applies transparency to background colors", () => {
        const [theme, bgcolor] = computeTheme(fullConfig, "default-dark", 0.5);
        expect(bgcolor).toMatch(/^#[0-9a-f]{8}$/i);
        expect(theme.background).toBe("#00000000");
        expect(theme.selectionBackground).toMatch(/^#[0-9a-f]{8}$/i);
    });
});
