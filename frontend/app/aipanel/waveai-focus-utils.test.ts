// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { findWaveAIPanel, waveAIHasFocusWithin, waveAIHasSelection } from "./waveai-focus-utils";

class MockHTMLElement {
    parentElement: MockHTMLElement | null = null;
    hasAttribute(name: string): boolean {
        return false;
    }
}

class MockText {
    parentElement: MockHTMLElement | null = null;
}

function makePanelChain(): MockHTMLElement {
    const root = new MockHTMLElement();
    const panel = new MockHTMLElement();
    panel.parentElement = root;
    panel.hasAttribute = (name: string) => name === "data-waveai-panel";
    const input = new MockHTMLElement();
    input.parentElement = panel;
    return input;
}

describe("waveai focus utils", () => {
    beforeAll(() => {
        vi.stubGlobal("HTMLElement", MockHTMLElement);
        vi.stubGlobal("Text", MockText);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    describe("findWaveAIPanel", () => {
        it("returns null when no panel ancestor exists", () => {
            const root = new MockHTMLElement();
            const child = new MockHTMLElement();
            child.parentElement = root;
            expect(findWaveAIPanel(child as unknown as HTMLElement)).toBeNull();
        });

        it("finds the nearest waveai panel ancestor", () => {
            const input = makePanelChain();
            expect(findWaveAIPanel(input as unknown as HTMLElement)?.hasAttribute("data-waveai-panel")).toBe(true);
        });
    });

    describe("waveAIHasFocusWithin", () => {
        it("returns true when focus target is inside the panel", () => {
            expect(waveAIHasFocusWithin(makePanelChain() as unknown as Element)).toBe(true);
        });

        it("returns false for elements outside the panel", () => {
            const outside = new MockHTMLElement();
            outside.parentElement = new MockHTMLElement();
            expect(waveAIHasFocusWithin(outside as unknown as Element)).toBe(false);
        });

        it("returns false for non-HTMLElement focus targets", () => {
            expect(waveAIHasFocusWithin({} as Element)).toBe(false);
        });
    });

    describe("waveAIHasSelection", () => {
        it("returns false when selection is collapsed", () => {
            vi.stubGlobal("document", {
                getSelection: () => ({
                    rangeCount: 1,
                    isCollapsed: true,
                    anchorNode: null,
                }),
            });
            expect(waveAIHasSelection()).toBe(false);
        });

        it("returns true when selection anchor is inside the panel", () => {
            const anchor = makePanelChain();
            vi.stubGlobal("document", {
                getSelection: () => ({
                    rangeCount: 1,
                    isCollapsed: false,
                    anchorNode: anchor,
                }),
            });
            expect(waveAIHasSelection()).toBe(true);
        });
    });
});
