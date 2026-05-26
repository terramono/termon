// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { isAllowedExternalUrl, isAllowedRemoteFetchUrl } from "./urlutil";

describe("isAllowedExternalUrl", () => {
    it("allows http and https", () => {
        expect(isAllowedExternalUrl("https://example.com")).toBe(true);
        expect(isAllowedExternalUrl("http://example.com/path")).toBe(true);
    });

    it("allows mailto", () => {
        expect(isAllowedExternalUrl("mailto:user@example.com")).toBe(true);
    });

    it("blocks javascript and file", () => {
        expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
        expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    });

    it("rejects empty and non-string input", () => {
        expect(isAllowedExternalUrl("")).toBe(false);
        expect(isAllowedExternalUrl(null as unknown as string)).toBe(false);
    });

    it("rejects malformed urls", () => {
        expect(isAllowedExternalUrl("not a url")).toBe(false);
    });
});

describe("isAllowedRemoteFetchUrl", () => {
    it("allows public https", () => {
        expect(isAllowedRemoteFetchUrl("https://example.com/style.css", false)).toBe(true);
    });

    it("blocks loopback when localhost disallowed", () => {
        expect(isAllowedRemoteFetchUrl("http://127.0.0.1:8080/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://localhost/x", false)).toBe(false);
    });

    it("allows loopback when explicitly allowed", () => {
        expect(isAllowedRemoteFetchUrl("http://127.0.0.1:8080/x", true)).toBe(true);
    });

    it("allows data urls", () => {
        expect(isAllowedRemoteFetchUrl("data:text/css,body{}", false)).toBe(true);
    });

    it("blocks private IPv4 ranges when localhost disallowed", () => {
        expect(isAllowedRemoteFetchUrl("http://10.0.0.1/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://172.16.0.1/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://192.168.1.1/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://169.254.169.254/latest", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://0.0.0.0/x", false)).toBe(false);
    });

    it("blocks link-local and loopback hostnames", () => {
        expect(isAllowedRemoteFetchUrl("http://[::1]/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("http://foo.localhost/x", false)).toBe(false);
    });

    it("blocks non-http protocols", () => {
        expect(isAllowedRemoteFetchUrl("ftp://example.com/x", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("file:///etc/passwd", false)).toBe(false);
    });

    it("rejects empty and malformed input", () => {
        expect(isAllowedRemoteFetchUrl("", false)).toBe(false);
        expect(isAllowedRemoteFetchUrl("not-a-url", false)).toBe(false);
    });
});
