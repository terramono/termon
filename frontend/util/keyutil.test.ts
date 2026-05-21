// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, afterEach } from "vitest";
import {
    checkKeyPressed,
    getKeyUtilPlatform,
    keyboardEventToASCII,
    parseKeyDescription,
    setKeyUtilPlatform,
    waveEventToKeyDesc,
} from "./keyutil";

afterEach(() => {
    setKeyUtilPlatform("darwin");
});

describe("parseKeyDescription", () => {
    it("maps Cmd to Meta on macOS", () => {
        setKeyUtilPlatform("darwin");
        const parsed = parseKeyDescription("Cmd:a");
        expect(parsed.mods.Meta).toBe(true);
        expect(parsed.mods.Cmd).toBe(true);
        expect(parsed.key).toBe("a");
    });

    it("maps Cmd to Alt on Windows", () => {
        setKeyUtilPlatform("win32");
        const parsed = parseKeyDescription("Cmd:a");
        expect(parsed.mods.Alt).toBe(true);
        expect(parsed.mods.Cmd).toBe(true);
    });

    it("parses code keys", () => {
        const parsed = parseKeyDescription("c{ArrowUp}");
        expect(parsed.key).toBe("ArrowUp");
        expect(parsed.keyType).toBe("code");
    });

    it("applies shift for uppercase letter keys", () => {
        const parsed = parseKeyDescription("A");
        expect(parsed.key).toBe("A");
        expect(parsed.mods.Shift).toBe(true);
    });
});

describe("checkKeyPressed", () => {
    it("matches Cmd+Shift combinations on macOS", () => {
        setKeyUtilPlatform("darwin");
        const event = {
            cmd: true,
            option: false,
            meta: true,
            control: false,
            shift: true,
            alt: false,
            key: "z",
            code: "KeyZ",
        } as WaveKeyboardEvent;
        expect(checkKeyPressed(event, "Cmd:Shift:z")).toBe(true);
    });
});

describe("waveEventToKeyDesc", () => {
    it("formats modifier keys and space", () => {
        const desc = waveEventToKeyDesc({
            cmd: true,
            option: false,
            meta: false,
            control: false,
            shift: false,
            alt: false,
            key: " ",
            code: "Space",
        } as WaveKeyboardEvent);
        expect(desc).toBe("Cmd:Space");
    });

    it("uses code when key is empty", () => {
        const desc = waveEventToKeyDesc({
            cmd: false,
            option: false,
            meta: false,
            control: false,
            shift: false,
            alt: false,
            key: "",
            code: "F1",
        } as WaveKeyboardEvent);
        expect(desc).toBe("c{F1}");
    });
});

describe("keyboardEventToASCII", () => {
    it("returns printable characters without modifiers", () => {
        const event = {
            alt: false,
            control: false,
            meta: false,
            key: "x",
        } as WaveKeyboardEvent;
        expect(keyboardEventToASCII(event)).toBe("x");
    });

    it("returns control codes for ctrl+letter", () => {
        const event = {
            alt: false,
            control: true,
            meta: false,
            key: "c",
        } as WaveKeyboardEvent;
        expect(keyboardEventToASCII(event)).toBe("\x03");
    });

    it("returns empty string when meta is pressed", () => {
        const event = {
            alt: false,
            control: false,
            meta: true,
            key: "a",
        } as WaveKeyboardEvent;
        expect(keyboardEventToASCII(event)).toBe("");
    });
});

describe("setKeyUtilPlatform", () => {
    it("updates platform used by key helpers", () => {
        setKeyUtilPlatform("win32");
        expect(getKeyUtilPlatform()).toBe("win32");
    });
});
