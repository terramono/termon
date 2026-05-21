// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { formatFileSize, getFilteredAIModeConfigs, getModeDisplayName, normalizeMimeType } from "./ai-utils";

describe("formatFileSize", () => {
    it("formats bytes and kilobytes", () => {
        expect(formatFileSize(0)).toBe("0 B");
        expect(formatFileSize(1024)).toBe("1 KB");
        expect(formatFileSize(1536)).toBe("1.5 KB");
    });
});

describe("normalizeMimeType", () => {
    it("preserves image and pdf mime types", () => {
        expect(normalizeMimeType({ type: "image/png", name: "x.png" } as File)).toBe("image/png");
        expect(normalizeMimeType({ type: "application/pdf", name: "x.pdf" } as File)).toBe("application/pdf");
    });

    it("normalizes code files to text/plain", () => {
        expect(normalizeMimeType({ type: "application/javascript", name: "app.js" } as File)).toBe("text/plain");
    });
});

describe("getFilteredAIModeConfigs", () => {
    const configs: Record<string, AIModeConfigType> = {
        "waveai@quick": { "ai:provider": "wave", "display:order": 1, "display:name": "Quick" },
        "openai@gpt4": { "ai:provider": "openai", "display:order": 2, "display:name": "GPT-4" },
    };

    it("hides quick mode in builder when user has premium", () => {
        const result = getFilteredAIModeConfigs(configs, true, true, true);
        expect(result.waveProviderConfigs.map((c) => c.mode)).not.toContain("waveai@quick");
    });

    it("shows cloud modes when no custom models exist", () => {
        const waveOnly = {
            "waveai@quick": configs["waveai@quick"],
        };
        const result = getFilteredAIModeConfigs(waveOnly, false, false, false);
        expect(result.shouldShowCloudModes).toBe(true);
        expect(result.waveProviderConfigs.length).toBe(1);
    });
});

describe("getModeDisplayName", () => {
    it("uses display:name when set", () => {
        expect(getModeDisplayName({ "display:name": "My Model" })).toBe("My Model");
    });

    it("formats azure-legacy provider", () => {
        expect(
            getModeDisplayName({
                "ai:provider": "azure-legacy",
                "ai:azureresourcename": "my-resource",
            })
        ).toBe("my-resource (azure)");
    });

    it("formats generic provider and model", () => {
        expect(
            getModeDisplayName({
                "ai:provider": "openai",
                "ai:model": "gpt-4",
            })
        ).toBe("gpt-4 (openai)");
    });
});
