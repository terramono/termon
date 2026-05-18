// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { connectionMetaFromSshHost, groupHosts, hostCardSubtitleFromSshHost } from "./sshpanel-model";

const userHostRe = /^([a-zA-Z0-9][a-zA-Z0-9._@\\-]*@)?([a-zA-Z0-9][a-zA-Z0-9.-]*)(?::([0-9]+))?$/;

function expectCompatibleWithParseOpts(meta: string): void {
    expect(meta, `expected ParseOpts-compatible string, got: ${meta}`).toMatch(userHostRe);
}

function host(partial: Partial<SshConfigHost> & Pick<SshConfigHost, "pattern">): SshConfigHost {
    return {
        pattern: partial.pattern,
        hostname: partial.hostname ?? "",
        user: partial.user ?? "",
        port: partial.port ?? "",
    };
}

describe("connectionMetaFromSshHost", () => {
    it("omits user and port for minimal host", () => {
        const meta = connectionMetaFromSshHost(host({ pattern: "mybox" }));
        expect(meta).toBe("mybox");
        expectCompatibleWithParseOpts(meta);
    });

    it("includes user when set", () => {
        const meta = connectionMetaFromSshHost(host({ pattern: "mybox", user: "deploy" }));
        expect(meta).toBe("deploy@mybox");
        expectCompatibleWithParseOpts(meta);
    });

    it("omits default port 22", () => {
        expect(connectionMetaFromSshHost(host({ pattern: "h", user: "u", port: "22" }))).toBe("u@h");
        expect(connectionMetaFromSshHost(host({ pattern: "h", port: "22" }))).toBe("h");
    });

    it("includes non-default port", () => {
        const meta = connectionMetaFromSshHost(host({ pattern: "edge", user: "root", port: "2222" }));
        expect(meta).toBe("root@edge:2222");
        expectCompatibleWithParseOpts(meta);
    });

    it("uses Host pattern as host segment (alias), not HostName", () => {
        const meta = connectionMetaFromSshHost(
            host({ pattern: "prod", hostname: "10.0.0.1", user: "ubuntu", port: "" })
        );
        expect(meta).toBe("ubuntu@prod");
        expectCompatibleWithParseOpts(meta);
    });
});

describe("hostCardSubtitleFromSshHost", () => {
    it("uses hostname when set", () => {
        expect(
            hostCardSubtitleFromSshHost(host({ pattern: "prod", hostname: "10.0.0.1", user: "ubuntu", port: "2222" }))
        ).toBe("ubuntu@10.0.0.1:2222");
    });

    it("falls back to pattern when hostname is empty", () => {
        expect(hostCardSubtitleFromSshHost(host({ pattern: "mybox", user: "deploy" }))).toBe("deploy@mybox");
    });

    it("omits user and port when unset", () => {
        expect(hostCardSubtitleFromSshHost(host({ pattern: "plain" }))).toBe("plain");
    });
});

describe("groupHosts", () => {
    it("returns empty list for empty input", () => {
        expect(groupHosts([])).toEqual([]);
    });

    it("places single-segment patterns in other", () => {
        const groups = groupHosts([host({ pattern: "mybox" }), host({ pattern: "plain" })]);
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe("other");
        expect(groups[0].hosts).toHaveLength(2);
    });

    it("groups by first delimiter segment", () => {
        const groups = groupHosts([
            host({ pattern: "acme-web" }),
            host({ pattern: "acme-db" }),
            host({ pattern: "beta-api" }),
        ]);
        expect(groups.map((g) => g.name)).toEqual(["acme", "beta"]);
        const acme = groups.find((g) => g.name === "acme");
        expect(acme?.hosts.map((h) => h.pattern)).toEqual(["acme-db", "acme-web"]);
    });

    it("sorts hosts inside a group by pattern then user then port", () => {
        const groups = groupHosts([
            host({ pattern: "acme-zebra", user: "b" }),
            host({ pattern: "acme-zebra", user: "a" }),
            host({ pattern: "acme-alpha" }),
        ]);
        const acme = groups.find((g) => g.name === "acme");
        expect(acme?.hosts.map((h) => `${h.pattern}|${h.user}`)).toEqual([
            "acme-alpha|",
            "acme-zebra|a",
            "acme-zebra|b",
        ]);
    });

    it("sorts other last and remaining alphabetically", () => {
        const groups = groupHosts([host({ pattern: "z" }), host({ pattern: "a" }), host({ pattern: "g.h" })]);
        expect(groups.map((g) => g.name)).toEqual(["g", "other"]);
    });

    it("keeps duplicate patterns distinct when user or port differs", () => {
        const groups = groupHosts([
            host({ pattern: "shared", user: "alice", port: "" }),
            host({ pattern: "shared", user: "bob", port: "2222" }),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].hosts).toHaveLength(2);
        expect(connectionMetaFromSshHost(groups[0].hosts[0])).toBe("alice@shared");
        expect(connectionMetaFromSshHost(groups[0].hosts[1])).toBe("bob@shared:2222");
    });
});
