// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
    AIPanel_MinWidth,
    VTabBar_MaxWidth,
    VTabBar_MinWidth,
    clampAIPanelWidth,
    clampVTabWidth,
    computeWorkspaceLayout,
    getInnerAIPanelInitialPercentage,
    getInnerVTabInitialPercentage,
    getLeftGroupInitialPercentage,
    resolveAIWidth,
} from "./workspace-layout-util";

describe("clampVTabWidth", () => {
    it("clamps below minimum", () => {
        expect(clampVTabWidth(50)).toBe(VTabBar_MinWidth);
    });

    it("clamps above maximum", () => {
        expect(clampVTabWidth(400)).toBe(VTabBar_MaxWidth);
    });

    it("passes through in-range values", () => {
        expect(clampVTabWidth(200)).toBe(200);
    });
});

describe("clampAIPanelWidth", () => {
    it("clamps to minimum width", () => {
        expect(clampAIPanelWidth(100, 1200)).toBe(AIPanel_MinWidth);
    });

    it("clamps to max ratio of window width", () => {
        expect(clampAIPanelWidth(900, 1200)).toBe(792);
    });

    it("returns minimum when window is too narrow for ratio max", () => {
        expect(clampAIPanelWidth(500, 400)).toBe(AIPanel_MinWidth);
    });
});

describe("resolveAIWidth", () => {
    it("uses default ratio when width is unset", () => {
        expect(resolveAIWidth(1200, null)).toBe(396);
    });

    it("clamps stored width", () => {
        expect(resolveAIWidth(1200, 900)).toBe(792);
    });
});

describe("computeWorkspaceLayout", () => {
    it("returns full content when both panels hidden", () => {
        const layout = computeWorkspaceLayout({
            windowWidth: 1000,
            vtabVisible: false,
            aiPanelVisible: false,
            vtabWidth: 220,
            aiPanelWidth: 300,
        });
        expect(layout.outer).toEqual([0, 100]);
        expect(layout.inner).toEqual([50, 50]);
    });

    it("splits outer percentages for visible panels", () => {
        const layout = computeWorkspaceLayout({
            windowWidth: 1000,
            vtabVisible: true,
            aiPanelVisible: true,
            vtabWidth: 220,
            aiPanelWidth: 300,
        });
        expect(layout.outer[0]).toBeCloseTo(52, 5);
        expect(layout.outer[1]).toBeCloseTo(48, 5);
        expect(layout.inner[0] + layout.inner[1]).toBeCloseTo(100, 5);
    });

    it("handles zero window width", () => {
        const layout = computeWorkspaceLayout({
            windowWidth: 0,
            vtabVisible: true,
            aiPanelVisible: true,
            vtabWidth: 220,
            aiPanelWidth: 300,
        });
        expect(layout.outer).toEqual([0, 100]);
    });
});

describe("initial percentage helpers", () => {
    const base = {
        windowWidth: 1000,
        vtabVisible: true,
        aiPanelVisible: true,
        vtabWidth: 200,
        aiPanelWidth: 300,
    };

    it("computes left group percentage with left tab bar", () => {
        expect(getLeftGroupInitialPercentage({ ...base, showLeftTabBar: true })).toBeCloseTo(50, 5);
    });

    it("omits vtab from left group when tab bar is top", () => {
        expect(getLeftGroupInitialPercentage({ ...base, showLeftTabBar: false })).toBeCloseTo(30, 5);
    });

    it("computes inner vtab and ai splits", () => {
        expect(getInnerVTabInitialPercentage({ ...base, showLeftTabBar: true })).toBeCloseTo(40, 5);
        expect(getInnerAIPanelInitialPercentage({ ...base, showLeftTabBar: true })).toBeCloseTo(60, 5);
    });

    it("returns zero inner vtab when tab bar is hidden", () => {
        expect(getInnerVTabInitialPercentage({ ...base, showLeftTabBar: false })).toBe(0);
    });
});
