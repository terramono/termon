// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

export const AIPanel_DefaultWidth = 300;
export const AIPanel_DefaultWidthRatio = 0.33;
export const AIPanel_MinWidth = 300;
export const AIPanel_MaxWidthRatio = 0.66;

export const VTabBar_DefaultWidth = 220;
export const VTabBar_MinWidth = 110;
export const VTabBar_MaxWidth = 280;

export function clampVTabWidth(w: number): number {
    return Math.max(VTabBar_MinWidth, Math.min(w, VTabBar_MaxWidth));
}

export function clampAIPanelWidth(w: number, windowWidth: number): number {
    const maxWidth = Math.floor(windowWidth * AIPanel_MaxWidthRatio);
    if (AIPanel_MinWidth > maxWidth) return AIPanel_MinWidth;
    return Math.max(AIPanel_MinWidth, Math.min(w, maxWidth));
}

export function resolveAIWidth(windowWidth: number, aiPanelWidth: number | null): number {
    let w = aiPanelWidth;
    if (w == null) {
        w = Math.max(AIPanel_DefaultWidth, windowWidth * AIPanel_DefaultWidthRatio);
    }
    return clampAIPanelWidth(w, windowWidth);
}

export type WorkspaceLayoutInput = {
    windowWidth: number;
    vtabVisible: boolean;
    aiPanelVisible: boolean;
    vtabWidth: number;
    aiPanelWidth: number | null;
};

export function computeWorkspaceLayout(input: WorkspaceLayoutInput): { outer: number[]; inner: number[] } {
    const vtabW = input.vtabVisible ? clampVTabWidth(input.vtabWidth) : 0;
    const aiW = input.aiPanelVisible ? resolveAIWidth(input.windowWidth, input.aiPanelWidth) : 0;
    const leftGroupW = vtabW + aiW;

    const leftPct = input.windowWidth > 0 ? (leftGroupW / input.windowWidth) * 100 : 0;
    const contentPct = Math.max(0, 100 - leftPct);

    let vtabPct: number;
    let aiPct: number;
    if (leftGroupW > 0) {
        vtabPct = (vtabW / leftGroupW) * 100;
        aiPct = 100 - vtabPct;
    } else {
        vtabPct = 50;
        aiPct = 50;
    }

    return { outer: [leftPct, contentPct], inner: [vtabPct, aiPct] };
}

export function getLeftGroupInitialPercentage(input: WorkspaceLayoutInput & { showLeftTabBar: boolean }): number {
    const vtabW = input.showLeftTabBar ? clampVTabWidth(input.vtabWidth) : 0;
    const aiW = input.aiPanelVisible ? resolveAIWidth(input.windowWidth, input.aiPanelWidth) : 0;
    if (input.windowWidth === 0) {
        return 0;
    }
    return ((vtabW + aiW) / input.windowWidth) * 100;
}

export function getInnerVTabInitialPercentage(input: WorkspaceLayoutInput & { showLeftTabBar: boolean }): number {
    if (!input.showLeftTabBar) return 0;
    const vtabW = clampVTabWidth(input.vtabWidth);
    const aiW = input.aiPanelVisible ? resolveAIWidth(input.windowWidth, input.aiPanelWidth) : 0;
    const total = vtabW + aiW;
    if (total === 0) return 50;
    return (vtabW / total) * 100;
}

export function getInnerAIPanelInitialPercentage(input: WorkspaceLayoutInput & { showLeftTabBar: boolean }): number {
    const vtabW = input.showLeftTabBar ? clampVTabWidth(input.vtabWidth) : 0;
    const aiW = input.aiPanelVisible ? resolveAIWidth(input.windowWidth, input.aiPanelWidth) : 0;
    const total = vtabW + aiW;
    if (total === 0) return 50;
    return (aiW / total) * 100;
}
