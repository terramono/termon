// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { globalStore } from "@/app/store/jotaiStore";
import { atom, PrimitiveAtom, Provider } from "jotai";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection } from "../lib/types";

const layoutStateAtom = atom<LayoutState>({
    rootnode: undefined,
    focusednodeid: undefined,
    magnifiednodeid: undefined,
});

vi.mock("../lib/layoutAtom", () => ({
    getLayoutStateAtomFromTab: () => layoutStateAtom,
}));

vi.mock("@/app/hook/useDimensions", () => ({
    useOnResize: vi.fn(),
}));

const { staticTabIdAtom, prefersReducedMotionAtom } = vi.hoisted(() => {
    const { atom: jotaiAtom } = require("jotai");
    return {
        staticTabIdAtom: jotaiAtom(""),
        prefersReducedMotionAtom: jotaiAtom(false),
    };
});

vi.mock("@/app/store/global", async () => {
    const { globalStore } = await import("@/app/store/jotaiStore");
    const WOS = await import("@/app/store/wos");
    const { atom: jotaiAtom } = await import("jotai");
    return {
        atoms: {
            staticTabId: staticTabIdAtom,
            prefersReducedMotionAtom,
        },
        globalStore,
        WOS,
        getSettingsKeyAtom: () => jotaiAtom(0.85),
    };
});

const tabAtomById = new Map<string, PrimitiveAtom<Tab>>();

vi.mock("@/app/store/wos", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/store/wos")>();
    return {
        ...actual,
        makeORef: (_type: string, id: string) => `tab:${id}`,
        getWaveObjectAtom: (oref: string) => tabAtomById.get(oref.split(":")[1]),
        setObjectValue: vi.fn(),
    };
});

vi.mock("@/app/store/services", () => ({
    BlockService: {
        CleanupOrphanedBlocks: vi.fn(async () => {}),
    },
}));

vi.mock("@/app/store/focusManager", () => ({
    FocusManager: {
        getInstance: () => ({
            requestNodeFocus: vi.fn(),
            focusType: atom("node"),
        }),
    },
}));

import {
    deleteLayoutModelForTab,
    getLayoutModelForStaticTab,
    useDebouncedNodeInnerRect,
    useNodeModel,
    useTileLayout,
} from "../lib/layoutModelHooks";
import { LayoutModel } from "../lib/layoutModel";

function makeTabAtom(tabId = "tab-hooks-1"): PrimitiveAtom<Tab> {
    const tabAtom = atom<Tab>({
        oid: tabId,
        layoutstate: "layout-hooks-1",
        blockids: [],
    } as Tab);
    tabAtomById.set(tabId, tabAtom);
    return tabAtom;
}

function renderHook<T>(hook: () => T): { result: { current: T }; rerender: () => void; unmount: () => void } {
    const result = { current: null as T };
    const container = document.createElement("div");
    let root: Root;
    function HookWrapper() {
        result.current = hook();
        return null;
    }
    act(() => {
        root = createRoot(container);
        root.render(
            <Provider store={globalStore}>
                <HookWrapper />
            </Provider>
        );
    });
    return {
        result,
        rerender: () =>
            act(() =>
                root.render(
                    <Provider store={globalStore}>
                        <HookWrapper />
                    </Provider>
                )
            ),
        unmount: () => act(() => root.unmount()),
    };
}

afterEach(() => {
    deleteLayoutModelForTab("tab-hooks-1");
    deleteLayoutModelForTab("tab-hooks-static");
    deleteLayoutModelForTab("tab-missing");
    globalStore.set(staticTabIdAtom, "");
});

describe("layout model hook helpers", () => {
    it("reuses cached layout models per tab id", () => {
        const tabAtom = makeTabAtom();
        seedLayoutState();
        const first = renderHook(() => useTileLayout(tabAtom, makeContents()));
        const second = renderHook(() => useTileLayout(tabAtom, makeContents()));
        expect(first.result.current).toBe(second.result.current);
        first.unmount();
        second.unmount();
    });

    it("resolves layout models through static tab id", () => {
        globalStore.set(staticTabIdAtom, "tab-hooks-static");
        makeTabAtom("tab-hooks-static");
        seedLayoutState();
        expect(getLayoutModelForStaticTab()).toBeInstanceOf(LayoutModel);
        deleteLayoutModelForTab("tab-hooks-static");
    });

    it("subscribes static tab layout models to backend updates", () => {
        globalStore.set(staticTabIdAtom, "tab-hooks-static");
        const tabAtom = makeTabAtom("tab-hooks-static");
        seedLayoutState();
        const { result, unmount } = renderHook(() => useTileLayout(tabAtom, makeContents()));
        expect(getLayoutModelForStaticTab()).toBe(result.current);
        globalStore.set(layoutStateAtom, {
            rootnode: newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "updated" }),
            focusednodeid: undefined,
            magnifiednodeid: undefined,
        });
        unmount();
        deleteLayoutModelForTab("tab-hooks-static");
    });

    it("deletes cached layout models", () => {
        const tabAtom = makeTabAtom("tab-delete");
        seedLayoutState();
        const { result, unmount } = renderHook(() => useTileLayout(tabAtom, makeContents()));
        expect(result.current).toBeInstanceOf(LayoutModel);
        unmount();
        deleteLayoutModelForTab("tab-delete");
        const { result: next, unmount: unmountNext } = renderHook(() => useTileLayout(tabAtom, makeContents()));
        expect(next.current).toBeInstanceOf(LayoutModel);
        unmountNext();
        deleteLayoutModelForTab("tab-delete");
    });
});

describe("useNodeModel and useDebouncedNodeInnerRect", () => {
    it("returns node models from layout model", () => {
        const tabAtom = makeTabAtom("tab-node-model");
        const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "block-a" });
        seedLayoutState(root);
        const { result: layoutHook, unmount: unmountLayout } = renderHook(() => useTileLayout(tabAtom, makeContents()));
        const layoutModel = layoutHook.current;
        const { result, unmount } = renderHook(() => useNodeModel(layoutModel, root));
        expect(result.current.blockId).toBe("block-a");
        unmount();
        unmountLayout();
        deleteLayoutModelForTab("tab-node-model");
    });

    it("debounces inner rect unless reduced motion magnified or resizing", async () => {
        vi.useFakeTimers();
        const tabAtom = makeTabAtom("tab-debounce");
        const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
        const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
        const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
        seedLayoutState(root);
        const { result: layoutHook, unmount: unmountLayout } = renderHook(() =>
            useTileLayout(tabAtom, { ...makeContents(), gapSizePx: 4 })
        );
        const layoutModel = layoutHook.current;
        layoutModel.displayContainerRef.current = {
            getBoundingClientRect: () =>
                ({
                    top: 0,
                    left: 0,
                    width: 400,
                    height: 300,
                    right: 400,
                    bottom: 300,
                    x: 0,
                    y: 0,
                    toJSON: () => ({}),
                }) as DOMRect,
        } as HTMLDivElement;
        layoutModel.updateTree();
        globalStore.set(layoutModel.leafOrder, [
            { nodeid: leafA.id, blockid: "a" },
            { nodeid: leafB.id, blockid: "b" },
        ]);
        globalStore.set(layoutModel.leafs, [leafA, leafB]);
        const nodeModel = layoutModel.getNodeModel(leafA);
        const setProps = (width: string) => {
            globalStore.set(layoutModel.additionalProps, {
                [leafA.id]: {
                    rect: { top: 0, left: 0, width: 100, height: 100 },
                    transform: { width, height: "100px" },
                    treeKey: leafA.id,
                },
                [leafB.id]: {
                    rect: { top: 0, left: 100, width: 100, height: 100 },
                    transform: { width: "100px", height: "100px" },
                    treeKey: leafB.id,
                },
            });
        };
        globalStore.set(prefersReducedMotionAtom, true);
        setProps("100px");
        expect(globalStore.get(nodeModel.innerRect)).not.toBeNull();

        const { result, rerender, unmount } = renderHook(() => useDebouncedNodeInnerRect(nodeModel));
        await act(async () => {});
        rerender();
        expect(result.current?.width).toContain("100px");

        globalStore.set(prefersReducedMotionAtom, false);
        setProps("200px");
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(150);
        });
        rerender();
        expect(result.current?.width).toContain("200px");

        globalStore.set(prefersReducedMotionAtom, true);
        setProps("300px");
        rerender();
        expect(result.current?.width).toContain("300px");

        globalStore.set(prefersReducedMotionAtom, false);
        layoutModel.magnifyNodeToggle(leafA.id);
        setProps("400px");
        rerender();
        expect(result.current?.width).toContain("400px");

        unmount();
        unmountLayout();
        vi.useRealTimers();
        deleteLayoutModelForTab("tab-debounce");
    });
});

function seedLayoutState(root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "seed" })) {
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
}

function makeContents() {
    return {
        renderContent: () => <div>content</div>,
        renderPreview: () => <div>preview</div>,
        onNodeDelete: async () => {},
        gapSizePx: 4,
    };
}
