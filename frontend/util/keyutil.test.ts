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
    parseKey,
    parseKeyDescription,
    setKeyUtilPlatform,
    waveEventToKeyDesc,
} from "./keyutil";

afterEach(() => {
    setKeyUtilPlatform("darwin");
});

describe("parseKey", () => {
    it("parses code keys and logs malformed regex matches", () => {
        expect(parseKey("c{Enter}")).toEqual({ key: "Enter", type: "code" });
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const matchSpy = vi.spyOn(String.prototype, "match").mockReturnValue(["c{"] as RegExpMatchArray);
        expect(parseKey("c{")).toEqual({ key: "c{", type: "key" });
        expect(errorSpy).toHaveBeenCalled();
        matchSpy.mockRestore();
        errorSpy.mockRestore();
    });
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

    it("returns empty string for empty keys and alt-modified input", () => {
        expect(
            keyboardEventToASCII({
                alt: true,
                control: false,
                meta: false,
                key: "a",
            } as WaveKeyboardEvent)
        ).toBe("");
        expect(
            keyboardEventToASCII({
                alt: false,
                control: false,
                meta: false,
                key: "",
            } as WaveKeyboardEvent)
        ).toBe("");
    });

    it("logs and returns empty for unsupported multi-char keys", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        expect(
            keyboardEventToASCII({
                alt: false,
                control: false,
                meta: false,
                key: "F13",
            } as WaveKeyboardEvent)
        ).toBe("");
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });
});

describe("parseKeyDescription modifier mappings", () => {
    it("maps Option and Meta on macOS", () => {
        setKeyUtilPlatform("darwin");
        expect(parseKeyDescription("Option:a").mods.Alt).toBe(true);
        expect(parseKeyDescription("Meta:a").mods.Cmd).toBe(true);
    });

    it("maps Option and Meta on Windows", () => {
        setKeyUtilPlatform("win32");
        expect(parseKeyDescription("Option:a").mods.Meta).toBe(true);
        expect(parseKeyDescription("Meta:a").mods.Option).toBe(true);
    });

    it("maps Alt on macOS and Windows", () => {
        setKeyUtilPlatform("darwin");
        expect(parseKeyDescription("Alt:a").mods.Option).toBe(true);
        setKeyUtilPlatform("win32");
        expect(parseKeyDescription("Alt:a").mods.Cmd).toBe(true);
    });

    it("maps space key token to Space", () => {
        expect(parseKeyDescription(" ").key).toBe("Space");
    });

    it("maps Shift Ctrl and standalone modifiers", () => {
        const parsed = parseKeyDescription("Shift:Ctrl:Enter");
        expect(parsed.mods.Shift).toBe(true);
        expect(parsed.mods.Ctrl).toBe(true);
        expect(parsed.key).toBe("Enter");
    });
});

describe("waveEventToKeyDesc modifiers", () => {
    it("includes all modifier labels", () => {
        const desc = waveEventToKeyDesc({
            cmd: true,
            option: true,
            meta: true,
            control: true,
            shift: true,
            alt: true,
            key: "k",
            code: "KeyK",
        } as WaveKeyboardEvent);
        expect(desc).toBe("Cmd:Option:Meta:Ctrl:Shift:k");
    });
});

describe("checkKeyPressed edge cases", () => {
    it("matches uppercase keys with shift descriptions", () => {
        const event = {
            cmd: false,
            option: false,
            meta: false,
            control: false,
            shift: true,
            alt: false,
            key: "E",
            code: "KeyE",
        } as WaveKeyboardEvent;
        expect(checkKeyPressed(event, "E")).toBe(true);
        expect(checkKeyPressed(event, "Space")).toBe(false);
    });

    it("matches code-based key descriptions", () => {
        const event = {
            cmd: false,
            option: false,
            meta: false,
            control: false,
            shift: false,
            alt: false,
            key: "",
            code: "F1",
        } as WaveKeyboardEvent;
        expect(checkKeyPressed(event, "c{F1}")).toBe(true);
    });

    it("rejects modifier mismatches", () => {
        const event = {
            cmd: false,
            option: true,
            meta: false,
            control: false,
            shift: false,
            alt: false,
            key: "a",
            code: "KeyA",
        } as WaveKeyboardEvent;
        expect(checkKeyPressed(event, "a")).toBe(false);
    });

    it("rejects individual modifier mismatches and matches space keys", () => {
        const base = {
            cmd: false,
            option: false,
            meta: false,
            control: false,
            shift: false,
            alt: false,
            key: "a",
            code: "KeyA",
        } as WaveKeyboardEvent;
        expect(checkKeyPressed({ ...base, cmd: true }, "Ctrl:a")).toBe(false);
        expect(checkKeyPressed({ ...base, control: true }, "Cmd:a")).toBe(false);
        expect(checkKeyPressed({ ...base, control: false }, "Ctrl:a")).toBe(false);
        expect(checkKeyPressed({ ...base, alt: true }, "Option:a")).toBe(false);
        setKeyUtilPlatform("win32");
        expect(checkKeyPressed({ ...base, cmd: true, alt: false }, "Alt:a")).toBe(false);
        setKeyUtilPlatform("darwin");
        expect(checkKeyPressed({ ...base, option: true, alt: false }, "Alt:a")).toBe(false);
        setKeyUtilPlatform("darwin");
        expect(checkKeyPressed({ ...base, cmd: true, meta: false }, "Meta:a")).toBe(false);
        setKeyUtilPlatform("win32");
        expect(checkKeyPressed({ ...base, option: true, meta: false }, "Meta:a")).toBe(false);
        setKeyUtilPlatform("darwin");
        expect(
            checkKeyPressed({ ...base, key: " ", code: "Space" }, "Space")
        ).toBe(true);
    });
});

describe("adaptFromReactOrNativeKeyEvent", () => {
    it("maps Windows modifier keys", () => {
        setKeyUtilPlatform("win32");
        const waveEvent = adaptFromReactOrNativeKeyEvent({
            type: "keyup",
            ctrlKey: true,
            shiftKey: false,
            metaKey: false,
            altKey: true,
            code: "KeyB",
            key: "b",
            location: 0,
            repeat: false,
        } as React.KeyboardEvent);
        expect(waveEvent.cmd).toBe(true);
        expect(waveEvent.option).toBe(false);
        expect(waveEvent.type).toBe("keyup");
    });

    it("defaults unknown event types", () => {
        const waveEvent = adaptFromReactOrNativeKeyEvent({
            type: "custom",
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            altKey: false,
            code: "KeyC",
            key: "c",
            location: 0,
            repeat: false,
        } as React.KeyboardEvent);
        expect(waveEvent.type).toBe("unknown");
    });
});

describe("adaptFromElectronKeyEvent", () => {
    it("maps keyUp and Windows modifiers", () => {
        setKeyUtilPlatform("win32");
        const waveEvent = adaptFromElectronKeyEvent({
            type: "keyUp",
            control: false,
            meta: false,
            alt: true,
            shift: false,
            isAutoRepeat: true,
            location: 0,
            code: "Space",
            key: " ",
        });
        expect(waveEvent.type).toBe("keyup");
        expect(waveEvent.cmd).toBe(true);
        expect(waveEvent.repeat).toBe(true);
    });

    it("defaults unknown electron event types", () => {
        const waveEvent = adaptFromElectronKeyEvent({
            type: "other",
            control: false,
            meta: false,
            alt: false,
            shift: false,
            isAutoRepeat: false,
            location: 0,
            code: "KeyZ",
            key: "z",
        });
        expect(waveEvent.type).toBe("unknown");
    });
});

describe("keydownWrapper", () => {
    it("does not prevent default when handler returns false", () => {
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
        keydownWrapper(() => false)(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

describe("isInputEvent", () => {
    it("detects character input events", () => {
        expect(
            isInputEvent({
                cmd: false,
                option: false,
                meta: false,
                control: false,
                shift: false,
                alt: false,
                key: "z",
                code: "KeyZ",
            } as WaveKeyboardEvent)
        ).toBe(true);
    });
});
