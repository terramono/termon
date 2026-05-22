// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { getBlockingCommand } from "./shellblocking";

describe("getBlockingCommand", () => {
    it("returns null for empty input", () => {
        expect(getBlockingCommand(null, false)).toBeNull();
        expect(getBlockingCommand("", false)).toBeNull();
    });

    it("blocks always-blocked commands", () => {
        expect(getBlockingCommand("vim file.txt", false)).toBe("vim");
        expect(getBlockingCommand("htop", false)).toBe("htop");
        expect(getBlockingCommand("sudo htop", false)).toBe("htop");
    });

    it("blocks bare REPLs without args", () => {
        expect(getBlockingCommand("python3", false)).toBe("python3");
        expect(getBlockingCommand("node -e 'console.log(1)'", false)).toBeNull();
    });

    it("blocks interactive shells", () => {
        expect(getBlockingCommand("bash", false)).toBe("bash");
        expect(getBlockingCommand("bash -c 'echo hi'", false)).toBeNull();
        expect(getBlockingCommand("zsh -l", false)).toBe("zsh");
    });

    it("blocks docker attach and interactive exec", () => {
        expect(getBlockingCommand("docker attach mycontainer", false)).toBe("docker");
        expect(getBlockingCommand("docker exec -it mycontainer bash", false)).toBe("docker");
        expect(getBlockingCommand("docker exec mycontainer ls", false)).toBeNull();
    });

    it("blocks ssh when interactive", () => {
        expect(getBlockingCommand("ssh user@host", false)).toBe("ssh");
        expect(getBlockingCommand("ssh -t user@host", false)).toBe("ssh");
    });

    it("returns first token in alt buffer", () => {
        expect(getBlockingCommand("ls -la", true)).toBe("ls");
    });
});
