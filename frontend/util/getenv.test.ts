// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnv } from "./getenv";

describe("getEnv", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reads from electron api when window is available", () => {
        const getEnvMock = vi.fn().mockReturnValue("127.0.0.1:8080");
        vi.stubGlobal("window", { api: { getEnv: getEnvMock } });
        expect(getEnv("WAVE_SERVER_WEB_ENDPOINT")).toBe("127.0.0.1:8080");
        expect(getEnvMock).toHaveBeenCalledWith("WAVE_SERVER_WEB_ENDPOINT");
    });

    it("reads from process.env when window is unavailable", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("process", { env: { TEST_ENV_VAR: "from-process" } });
        expect(getEnv("TEST_ENV_VAR")).toBe("from-process");
    });

    it("returns null when neither window nor process is available", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("process", undefined);
        expect(getEnv("MISSING")).toBe(null);
    });
});
