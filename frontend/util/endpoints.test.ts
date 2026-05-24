// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";

const { isPreviewWindow, getEnv } = vi.hoisted(() => ({
    isPreviewWindow: vi.fn(() => false),
    getEnv: vi.fn((name: string) => {
        if (name === "WAVE_SERVER_WEB_ENDPOINT") {
            return "127.0.0.1:8080";
        }
        if (name === "WAVE_SERVER_WS_ENDPOINT") {
            return "127.0.0.1:8081";
        }
        return null;
    }),
}));

vi.mock("@/app/store/windowtype", () => ({
    isPreviewWindow,
}));

vi.mock("./getenv", () => ({
    getEnv,
}));

describe("server endpoints", () => {
    beforeEach(() => {
        vi.resetModules();
        isPreviewWindow.mockReturnValue(false);
    });

    it("returns null in preview windows", async () => {
        isPreviewWindow.mockReturnValue(true);
        const mod = await import("./endpoints");
        expect(mod.getWebServerEndpoint()).toBe(null);
        expect(mod.getWSServerEndpoint()).toBe(null);
    });

    it("builds http and ws endpoints from env in tab windows", async () => {
        const mod = await import("./endpoints");
        expect(mod.getWebServerEndpoint()).toBe("http://127.0.0.1:8080");
        expect(mod.getWSServerEndpoint()).toBe("ws://127.0.0.1:8081");
    });
});
