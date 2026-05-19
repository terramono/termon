// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

const AllowedExternalProtocols = new Set(["http:", "https:", "mailto:"]);

export function isAllowedExternalUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
        return false;
    }
    try {
        const parsed = new URL(url);
        return AllowedExternalProtocols.has(parsed.protocol);
    } catch {
        return false;
    }
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) {
        return true;
    }
    if (host === "[::1]" || host === "::1") {
        return true;
    }
    if (host === "0.0.0.0") {
        return true;
    }
    if (host === "169.254.169.254") {
        return true;
    }
    const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (!ipv4Match) {
        return false;
    }
    const octets = ipv4Match.slice(1, 5).map((o) => parseInt(o, 10));
    if (octets.some((o) => o > 255)) {
        return false;
    }
    const [a, b] = octets;
    if (a === 127) {
        return true;
    }
    if (a === 10) {
        return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
        return true;
    }
    if (a === 192 && b === 168) {
        return true;
    }
    if (a === 169 && b === 254) {
        return true;
    }
    return false;
}

export function isAllowedRemoteFetchUrl(url: string, allowLocalhost: boolean): boolean {
    if (!url || typeof url !== "string") {
        return false;
    }
    if (url.startsWith("data:")) {
        return true;
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }
        if (!allowLocalhost && isPrivateOrLoopbackHost(parsed.hostname)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}
