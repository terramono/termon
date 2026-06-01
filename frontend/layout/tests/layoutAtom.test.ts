// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { atom } from "jotai";
import { assert, test, vi } from "vitest";

const layoutStateAtom = atom<LayoutState>({
    rootnode: undefined,
    focusednodeid: undefined,
    magnifiednodeid: undefined,
});

vi.mock("@/app/store/global", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/store/global")>();
    return {
        ...actual,
        WOS: {
            ...actual.WOS,
            makeORef: (otype: string, oid: string) => `${otype}:${oid}`,
            getWaveObjectAtom: () => layoutStateAtom,
        },
    };
});

import { globalStore } from "@/app/store/jotaiStore";
import { getLayoutStateAtomFromTab } from "../lib/layoutAtom";

test("getLayoutStateAtomFromTab returns undefined when tab is missing", () => {
    const tabAtom = atom<Tab>(null as any);
    assert(getLayoutStateAtomFromTab(tabAtom, globalStore.get) == null);
});

test("getLayoutStateAtomFromTab resolves layout state atom from tab", () => {
    const tabAtom = atom<Tab>({
        oid: "tab-1",
        layoutstate: "layout-1",
    } as Tab);
    const resolved = getLayoutStateAtomFromTab(tabAtom, globalStore.get);
    assert(resolved === layoutStateAtom);
    assert(globalStore.get(resolved).rootnode == null);
});
