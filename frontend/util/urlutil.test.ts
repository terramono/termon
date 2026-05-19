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
});
