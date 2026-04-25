// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

export function findBuilderAppPanel(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement = element;
    while (current) {
        if (current.hasAttribute("data-builder-app-panel")) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

export function builderAppHasSelection(): boolean {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        return false;
    }

    let anchor = sel.anchorNode;
    if (anchor instanceof Text) {
        anchor = anchor.parentElement;
    }
    if (anchor instanceof HTMLElement) {
        return findBuilderAppPanel(anchor) != null;
    }

    return false;
}