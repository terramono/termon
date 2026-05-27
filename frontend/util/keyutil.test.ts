// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, afterEach, vi } from "vitest";
import {
    adaptFromElectronKeyEvent,
    adaptFromReactOrNativeKeyEvent,
    checkKeyPressed,
    getKeyUtilPlatform,
    isCharacterKeyEvent,
    isInputEvent,
    keyboardEventToASCII,
    keydownWrapper,
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

describe("adaptFromReactOrNativeKeyEvent", () => {
    it("maps macOS modifier keys from react events", () => {
        setKeyUtilPlatform("darwin");
        const waveEvent = adaptFromReactOrNativeKeyEvent({
            type: "keydown",
            ctrlKey: false,
            shiftKey: true,
            metaKey: true,
            altKey: false,
            code: "KeyA",
            key: "a",
            location: 0,
            repeat: false,
        } as React.KeyboardEvent);
        expect(waveEvent.cmd).toBe(true);
        expect(waveEvent.shift).toBe(true);
        expect(waveEvent.type).toBe("keydown");
    });
});

describe("adaptFromElectronKeyEvent", () => {
    it("maps electron keyDown events", () => {
        setKeyUtilPlatform("darwin");
        const waveEvent = adaptFromElectronKeyEvent({
            type: "keyDown",
            control: false,
            meta: true,
            alt: false,
            shift: false,
            isAutoRepeat: false,
            location: 0,
            code: "Enter",
            key: "Enter",
        });
        expect(waveEvent.type).toBe("keydown");
        expect(waveEvent.cmd).toBe(true);
        expect(waveEvent.key).toBe("Enter");
    });
});

describe("keydownWrapper", () => {
    it("prevents default when handler returns true", () => {
        const event = {
            type: "keydown",
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            altKey: false,
            code: "KeyX",
            key: "x",
            location: 0,
            repeat: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as KeyboardEvent;
        const handler = keydownWrapper(() => true);
        handler(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });
});

describe("isCharacterKeyEvent and isInputEvent", () => {
    it("detects single-character input without modifiers", () => {
        expect(
            isCharacterKeyEvent({
                alt: false,
                meta: false,
                control: false,
                key: "a",
            } as WaveKeyboardEvent)
        ).toBe(true);
        expect(
            isCharacterKeyEvent({
                alt: false,
                meta: false,
                control: true,
                key: "a",
            } as WaveKeyboardEvent)
        ).toBe(false);
    });

    it("detects navigation and editing keys as input events", () => {
        expect(
            isInputEvent({
                cmd: false,
                option: false,
                meta: false,
                control: false,
                shift: false,
                alt: false,
                key: "ArrowLeft",
                code: "ArrowLeft",
            } as WaveKeyboardEvent)
        ).toBe(true);
    });
});

describe("keyboardEventToASCII special keys", () => {
    it("maps arrow keys to escape sequences", () => {
        const event = {
            alt: false,
            control: false,
            meta: false,
            key: "ArrowUp",
        } as WaveKeyboardEvent;
        expect(keyboardEventToASCII(event)).toBe("\x1b[A");
    });
});
