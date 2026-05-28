import { describe, expect, it } from "vitest";

import { isClaudeCodeCommand, normalizeCmd } from "./osc-handlers";

describe("normalizeCmd", () => {
    it("strips env prefix and assignments", () => {
        expect(normalizeCmd('env FOO=bar claude --print')).toBe("claude --print");
        expect(normalizeCmd('ANTHROPIC_API_KEY="test" claude')).toBe("claude");
        expect(normalizeCmd("  git status  ")).toBe("git status");
    });

    it("strips multiple leading env assignments", () => {
        expect(normalizeCmd('FOO=1 BAR="two" ssh host')).toBe("ssh host");
        expect(normalizeCmd("env FOO=1 BAR=2 vim file.txt")).toBe("vim file.txt");
    });

    it("preserves commands without env wrappers", () => {
        expect(normalizeCmd("tail -f /var/log/syslog")).toBe("tail -f /var/log/syslog");
        expect(normalizeCmd("opencode run")).toBe("opencode run");
    });

    it("handles single-quoted env assignments", () => {
        expect(normalizeCmd("FOO='bar baz' claude")).toBe("claude");
    });
});

describe("isClaudeCodeCommand", () => {
    it("matches direct Claude Code invocations", () => {
        expect(isClaudeCodeCommand("claude")).toBe(true);
        expect(isClaudeCodeCommand("claude --dangerously-skip-permissions")).toBe(true);
    });

    it("matches Claude Code invocations wrapped with env assignments", () => {
        expect(isClaudeCodeCommand('ANTHROPIC_API_KEY="test" claude')).toBe(true);
        expect(isClaudeCodeCommand("env FOO=bar claude --print")).toBe(true);
    });

    it("ignores other commands", () => {
        expect(isClaudeCodeCommand("claudes")).toBe(false);
        expect(isClaudeCodeCommand("echo claude")).toBe(false);
        expect(isClaudeCodeCommand("ls ~/claude")).toBe(false);
        expect(isClaudeCodeCommand("cat /logs/claude")).toBe(false);
        expect(isClaudeCodeCommand("")).toBe(false);
        expect(isClaudeCodeCommand("opencode run")).toBe(false);
    });
});
