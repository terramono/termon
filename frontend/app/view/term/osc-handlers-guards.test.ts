// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { handleOsc16162Command, handleOsc52Command, handleOsc7Command } from "./osc-handlers";

describe("handleOsc7Command guard paths", () => {
    it("returns true when terminal is not loaded", () => {
        expect(handleOsc7Command("file:///tmp", "block-id", false)).toBe(true);
    });
});

describe("handleOsc52Command guard paths", () => {
    it("returns true when terminal is not loaded", () => {
        expect(handleOsc52Command("0;abc", "block-id", false, {} as any)).toBe(true);
    });
});

describe("handleOsc16162Command guard paths", () => {
    it("returns true when terminal is not loaded", () => {
        expect(handleOsc16162Command("A;{}", "block-id", false, { terminal: {} } as any)).toBe(true);
    });
});
