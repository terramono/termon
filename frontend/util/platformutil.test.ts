// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, afterEach } from "vitest";
import {
    isMacOS,
    isMacOSTahoeOrLater,
    isWindows,
    makeNativeLabel,
    setMacOSVersion,
    setPlatform,
} from "./platformutil";

afterEach(() => {
    setPlatform("darwin");
    setMacOSVersion(null);
});

describe("platform detection", () => {
    it("detects macOS", () => {
        setPlatform("darwin");
        expect(isMacOS()).toBe(true);
        expect(isWindows()).toBe(false);
    });

    it("detects Windows", () => {
        setPlatform("win32");
        expect(isWindows()).toBe(true);
        expect(isMacOS()).toBe(false);
    });
});

describe("isMacOSTahoeOrLater", () => {
    it("returns false without version info", () => {
        expect(isMacOSTahoeOrLater()).toBe(false);
    });

    it("returns true for macOS 16+", () => {
        setPlatform("darwin");
        setMacOSVersion("16.0");
        expect(isMacOSTahoeOrLater()).toBe(true);
    });

    it("returns false for older macOS versions", () => {
        setPlatform("darwin");
        setMacOSVersion("15.2");
        expect(isMacOSTahoeOrLater()).toBe(false);
    });
});

describe("makeNativeLabel", () => {
    it("uses Finder on macOS for directories", () => {
        setPlatform("darwin");
        expect(makeNativeLabel(true)).toBe("Reveal in Finder");
    });

    it("uses Explorer on Windows for directories", () => {
        setPlatform("win32");
        expect(makeNativeLabel(true)).toBe("Reveal in Explorer");
    });

    it("uses Default Application for files", () => {
        setPlatform("darwin");
        expect(makeNativeLabel(false)).toBe("Open File in Default Application");
    });
});
