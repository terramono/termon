// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";

describe("isDev", () => {
    afterEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("returns true when WAVETERM_DEV is set", async () => {
        vi.stubGlobal("window", { api: { getEnv: vi.fn().mockReturnValue("1") } });
        const { isDev, WaveDevVarName } = await import("./isdev");
        expect(WaveDevVarName).toBe("WAVETERM_DEV");
        expect(isDev()).toBe(true);
    });

    it("returns false when WAVETERM_DEV is unset", async () => {
        vi.stubGlobal("window", { api: { getEnv: vi.fn().mockReturnValue(null) } });
        const { isDev } = await import("./isdev");
        expect(isDev()).toBe(false);
    });
});
