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

    it("blocks kubectl and podman attach-like commands", () => {
        expect(getBlockingCommand("kubectl exec -it pod bash", false)).toBe("kubectl");
        expect(getBlockingCommand("podman attach mycontainer", false)).toBe("podman");
        expect(getBlockingCommand("kubectl logs pod", false)).toBeNull();
    });

    it("unwraps wrapper commands before blocking", () => {
        expect(getBlockingCommand("sudo vim /etc/hosts", false)).toBe("vim");
        expect(getBlockingCommand("sudo htop", false)).toBe("htop");
    });

    it("blocks ssh when interactive", () => {
        expect(getBlockingCommand("ssh user@host", false)).toBe("ssh");
        expect(getBlockingCommand("ssh -t user@host", false)).toBe("ssh");
    });

    it("blocks multiplexers and pagers", () => {
        expect(getBlockingCommand("tmux attach", false)).toBe("tmux");
        expect(getBlockingCommand("screen -r", false)).toBe("screen");
        expect(getBlockingCommand("less file.txt", false)).toBe("less");
    });

    it("allows non-interactive kubectl commands", () => {
        expect(getBlockingCommand("kubectl get pods", false)).toBeNull();
    });

    it("blocks su without args", () => {
        expect(getBlockingCommand("su", false)).toBe("su");
    });

    it("allows su with non-shell trailing command", () => {
        expect(getBlockingCommand("su -c whoami", false)).toBeNull();
    });

    it("allows bare REPL when args provided", () => {
        expect(getBlockingCommand("ruby -e 'puts 1'", false)).toBeNull();
    });

    it("blocks any command while in alt buffer", () => {
        expect(getBlockingCommand("ls -la", true)).toBe("ls");
        expect(getBlockingCommand("echo hi", true)).toBe("echo");
    });

    it("blocks mosh and telnet interactive sessions", () => {
        expect(getBlockingCommand("mosh user@host", false)).toBe("mosh");
        expect(getBlockingCommand("telnet host", false)).toBe("telnet");
    });

    it("blocks fish and pwsh shells when interactive", () => {
        expect(getBlockingCommand("fish", false)).toBe("fish");
        expect(getBlockingCommand("pwsh", false)).toBe("pwsh");
        expect(getBlockingCommand("pwsh -c Write-Host hi", false)).toBeNull();
    });

    it("strips path prefix before matching command", () => {
        expect(getBlockingCommand("/usr/bin/vim file.txt", false)).toBe("vim");
    });

    it("blocks lxc exec with tty flags", () => {
        expect(getBlockingCommand("lxc exec -t c1 bash", false)).toBe("lxc");
        expect(getBlockingCommand("lxc exec c1 ls", false)).toBeNull();
    });
});
