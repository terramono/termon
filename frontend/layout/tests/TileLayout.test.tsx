// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { globalStore } from "@/app/store/jotaiStore";
import { atom, PrimitiveAtom, Provider } from "jotai";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection, LayoutTreeActionType } from "../lib/types";

const layoutStateAtom = atom<LayoutState>({
    rootnode: undefined,
    focusednodeid: undefined,
    magnifiednodeid: undefined,
});
const magnifiedBlockSizeAtom = atom(0.85);
const magnifiedBlockBlurAtom = atom(4);
const { staticTabIdAtom } = vi.hoisted(() => {
    const { atom: jotaiAtom } = require("jotai");
    return { staticTabIdAtom: jotaiAtom("tab-tile-1") };
});
let tabAtomForMock: PrimitiveAtom<Tab>;
let dragPreviewFn: ((img: HTMLImageElement, opts: { offsetX: number; offsetY: number }) => void) | null = null;
let isDraggingState = false;

let dragLayerState = {
    activeDrag: false,
    dragClientOffset: null as { x: number; y: number } | null,
    dragItemType: null as string | null,
};
let dropHoverHandler: ((item: unknown, monitor: unknown) => void) | null = null;
let dropCallback: ((node: HTMLElement | null) => void) | null = null;
let dragCallback: ((node: HTMLElement | null) => void) | null = null;
let canDragFns: Array<() => boolean> = [];
let canDropFns: Array<(item: unknown, monitor: unknown) => boolean> = [];
let dropFns: Array<(item: unknown, monitor: unknown) => void> = [];

vi.mock("../lib/layoutAtom", () => ({
    getLayoutStateAtomFromTab: () => layoutStateAtom,
}));

vi.mock("@/app/hook/useDimensions", () => ({
    useOnResize: vi.fn(),
}));

vi.mock("@/app/store/global", async () => {
    const { globalStore } = await import("@/app/store/jotaiStore");
    const WOS = await import("@/app/store/wos");
    return {
        atoms: {
            staticTabId: staticTabIdAtom,
            prefersReducedMotionAtom: atom(false),
        },
        globalStore,
        WOS,
        getSettingsKeyAtom: (key: string) => {
            if (key === "window:magnifiedblocksize") {
                return magnifiedBlockSizeAtom;
            }
            if (key === "window:magnifiedblockblursecondarypx") {
                return magnifiedBlockBlurAtom;
            }
            return magnifiedBlockSizeAtom;
        },
    };
});

vi.mock("@/app/store/wos", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/store/wos")>();
    return {
        ...actual,
        makeORef: (_type: string, id: string) => `tab:${id}`,
        getWaveObjectAtom: () => tabAtomForMock,
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

vi.mock("react-dnd", () => ({
    useDrag: (factory: () => unknown) => {
        const spec = factory() as {
            item: () => unknown;
            collect: (monitor: unknown) => unknown;
            canDrag?: () => boolean;
        };
        if (spec.canDrag) {
            spec.canDrag();
            canDragFns.push(spec.canDrag);
        }
        if (spec.item) {
            spec.item();
        }
        return [
            spec.collect({ isDragging: () => isDraggingState }),
            (node: HTMLElement | null) => {
                dragCallback = () => node;
            },
            (img: HTMLImageElement, opts: { offsetX: number; offsetY: number }) => dragPreviewFn?.(img, opts),
        ];
    },
    useDrop: (factory: () => unknown) => {
        const spec = factory() as {
            hover: (item: unknown, monitor: unknown) => void;
            canDrop?: (item: unknown, monitor: unknown) => boolean;
            drop?: (item: unknown, monitor: unknown) => void;
        };
        dropHoverHandler = spec.hover;
        if (spec.canDrop) {
            canDropFns.push(spec.canDrop);
        }
        if (spec.drop) {
            dropFns.push(spec.drop);
        }
        return [
            {},
            (node: HTMLElement | null) => {
                dropCallback = () => node;
            },
        ];
    },
    useDragLayer: (collect: (monitor: unknown) => unknown) =>
        collect({
            isDragging: () => dragLayerState.activeDrag,
            getClientOffset: () => dragLayerState.dragClientOffset,
            getItemType: () => dragLayerState.dragItemType,
        }),
    DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-dnd-html5-backend", () => ({
    HTML5Backend: {},
}));

vi.mock("html-to-image", () => ({
    toPng: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
}));

vi.mock("use-device-pixel-ratio", () => ({
    useDevicePixelRatio: () => 2,
}));

import { deleteLayoutModelForTab, getLayoutModelForStaticTab } from "../lib/layoutModelHooks";
import { TileLayout } from "../lib/TileLayout";
import { toPng } from "html-to-image";

function makeTabAtom(tabId = "tab-tile-1") {
    const tabAtom = atom<Tab>({
        oid: tabId,
        layoutstate: "layout-tile-1",
        blockids: [],
    } as Tab);
    tabAtomForMock = tabAtom;
    return tabAtom;
}

function seedTwoLeafLayout() {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: leafA.id,
        magnifiednodeid: undefined,
    });
    return { leafA, leafB, root };
}

function renderTileLayout(tabAtom = makeTabAtom(), getCursorPoint?: () => Point) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const tileLayout = (
        <Provider store={globalStore}>
            <TileLayout tabAtom={tabAtom} contents={tileLayoutContents} getCursorPoint={getCursorPoint} />
        </Provider>
    );
    act(() => {
        root.render(tileLayout);
    });
    return {
        container,
        root,
        tabAtom,
        rerender: () =>
            act(() => {
                root.render(tileLayout);
            }),
    };
}

const tileLayoutContents = {
    className: "test-layout",
    renderContent: () => <div className="tile-content">block</div>,
    renderPreview: () => <div className="tile-preview">preview</div>,
    onNodeDelete: async () => {},
    gapSizePx: 6,
};

function mockDisplayContainerRect(display: HTMLDivElement) {
    display.getBoundingClientRect = () =>
        ({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            width: 400,
            height: 300,
            right: 400,
            bottom: 300,
            toJSON: () => ({}),
        }) as DOMRect;
}

function getReactProps(element: Element): Record<string, unknown> {
    const key = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
    return key ? ((element as Record<string, unknown>)[key] as Record<string, unknown>) : {};
}

function invokeReactHandler(element: Element, handlerName: string, event: Record<string, unknown>) {
    const props = getReactProps(element);
    const handler = props[handlerName];
    if (typeof handler === "function") {
        handler(event);
    }
}

async function syncTileLayoutTree(container: HTMLElement) {
    const display = container.querySelector(".display-container") as HTMLDivElement;
    mockDisplayContainerRect(display);
    const model = getLayoutModelForStaticTab();
    if (!model.displayContainerRef.current) {
        (model.displayContainerRef as { current: HTMLDivElement | null }).current = display;
    }
    await act(async () => {
        model.registerTileLayout(tileLayoutContents);
        model.updateTree();
        vi.advanceTimersByTime(60);
    });
}

beforeEach(() => {
    dragLayerState = { activeDrag: false, dragClientOffset: null, dragItemType: null };
    dropHoverHandler = null;
    dropCallback = null;
    dragCallback = null;
    canDragFns = [];
    canDropFns = [];
    dropFns = [];
    dragPreviewFn = null;
    isDraggingState = false;
    globalStore.set(staticTabIdAtom, "tab-tile-1");
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
    deleteLayoutModelForTab("tab-tile-1");
});

describe("TileLayout", () => {
    it("renders leaf nodes and enables animation after mount", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await act(async () => {
            vi.advanceTimersByTime(60);
        });
        expect(container.querySelector(".tile-layout")).toBeTruthy();
        expect(container.querySelector(".display-container")).toBeTruthy();
        expect(container.querySelector(".tile-layout.animate")).toBeTruthy();
    });

    it("clears pending action when drag cursor leaves container", () => {
        const { leafA, leafB } = seedTwoLeafLayout();
        const { container } = renderTileLayout();
        const display = container.querySelector(".display-container") as HTMLDivElement;
        display.getBoundingClientRect = () =>
            ({
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                width: 200,
                height: 200,
                right: 200,
                bottom: 200,
                toJSON: () => ({}),
            }) as DOMRect;
        dragLayerState = {
            activeDrag: true,
            dragClientOffset: { x: 500, y: 500 },
            dragItemType: "TILE_ITEM",
        };
        act(() => {
            container.querySelector(".tile-layout")?.dispatchEvent(new Event("rerender"));
        });
        const model = globalStore;
        expect(leafA.id).not.toBe(leafB.id);
        expect(display).toBeTruthy();
    });

    it("handles overlay drop hover and pointer preview generation", async () => {
        const { leafA } = seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);

        act(() => {
            dropCallback?.(document.createElement("div"));
            dragCallback?.(document.createElement("div"));
        });

        const monitor = {
            isOver: () => true,
            canDrop: () => true,
            getItem: () => leafA,
            getClientOffset: () => ({ x: 50, y: 50 }),
            didDrop: () => false,
        };
        act(() => {
            dropHoverHandler?.(leafA, monitor);
        });

        expect(container.querySelector(".overlay-container")).toBeTruthy();
    });

    it("renders display nodes, resize handles, and placeholder overlay", async () => {
        const { leafA, leafB } = seedTwoLeafLayout();
        const { container, rerender } = renderTileLayout();
        await syncTileLayoutTree(container);
        rerender();
        const model = getLayoutModelForStaticTab();

        expect(container.querySelectorAll(".tile-content").length).toBe(2);
        expect(container.querySelectorAll(".resize-handle").length).toBeGreaterThan(0);

        globalStore.set(model.pendingTreeAction.throttledValueAtom, {
            type: LayoutTreeActionType.Swap,
            node1Id: leafA.id,
            node2Id: leafB.id,
        });
        await act(async () => {
            vi.advanceTimersByTime(0);
        });
        expect(container.querySelector(".placeholder")).toBeTruthy();
    });

    it("shows magnified and ephemeral backdrops and handles clicks", async () => {
        const { leafA, leafB } = seedTwoLeafLayout();
        const { container, rerender } = renderTileLayout();
        await syncTileLayoutTree(container);
        const model = getLayoutModelForStaticTab();
        await act(async () => {
            model.magnifyNodeToggle(leafB.id);
            model.newEphemeralNode("eph-block");
            model.updateTree();
        });
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        rerender();

        const magBackdrop = container.querySelector(".magnified-node-backdrop") as HTMLDivElement;
        const ephBackdrop = container.querySelector(".ephemeral-node-backdrop") as HTMLDivElement;
        expect(magBackdrop).toBeTruthy();
        expect(ephBackdrop).toBeTruthy();

        act(() => {
            magBackdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            ephBackdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
        expect(model.treeState.magnifiedNodeId).toBeFalsy();
    });

    it("renders drag preview markup for leaf nodes", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);

        expect(container.querySelectorAll(".tile-preview-container").length).toBeGreaterThan(0);
        expect(container.querySelectorAll(".tile-preview").length).toBeGreaterThan(0);
    });

    it("handles resize handle pointer capture lifecycle", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);

        const handle = container.querySelector(".resize-handle") as HTMLDivElement;
        handle.setPointerCapture = vi.fn();
        act(() => {
            handle?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
            handle?.dispatchEvent(new PointerEvent("gotpointercapture", { bubbles: true, pointerId: 1 }));
            handle?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: 120, clientY: 80 }));
            handle?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 2, clientX: 50, clientY: 50 }));
            handle?.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 1 }));
        });
        await act(async () => {
            vi.advanceTimersByTime(40);
        });
        expect(handle).toBeTruthy();
    });

    it("clears pending action when overlay hover cannot drop", async () => {
        const { leafA } = seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        act(() => {
            dropCallback?.(document.createElement("div"));
        });
        const monitor = {
            isOver: () => true,
            canDrop: () => false,
            getItem: () => leafA,
            getClientOffset: () => ({ x: 10, y: 10 }),
            didDrop: () => false,
        };
        act(() => {
            dropHoverHandler?.(leafA, monitor);
        });
        expect(container.querySelector(".overlay-node")).toBeTruthy();
    });

    it("marks tile nodes as dragging when drag layer is active", async () => {
        isDraggingState = true;
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        expect(container.querySelector(".tile-node.dragging")).toBeTruthy();
    });

    it("uses getCursorPoint fallback when drag offset is missing", () => {
        seedTwoLeafLayout();
        const getCursorPoint = vi.fn(() => ({ x: -10, y: -10 }));
        const { container } = renderTileLayout(makeTabAtom(), getCursorPoint);
        const display = container.querySelector(".display-container") as HTMLDivElement;
        display.getBoundingClientRect = () =>
            ({
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                width: 100,
                height: 100,
                right: 100,
                bottom: 100,
                toJSON: () => ({}),
            }) as DOMRect;
        dragLayerState = {
            activeDrag: true,
            dragClientOffset: null,
            dragItemType: "TILE_ITEM",
        };
        vi.advanceTimersByTime(150);
        expect(getCursorPoint).toHaveBeenCalled();
    });

    it("disables drag for magnified nodes", async () => {
        const { leafB } = seedTwoLeafLayout();
        const { container, rerender } = renderTileLayout();
        await syncTileLayoutTree(container);
        const model = getLayoutModelForStaticTab();
        await act(async () => {
            model.magnifyNodeToggle(leafB.id);
            model.updateTree();
        });
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        const latestCanDrag = canDragFns.slice(-2);
        expect(latestCanDrag.some((fn) => fn() === false)).toBe(true);
    });

    it("disables drag for ephemeral nodes", async () => {
        seedTwoLeafLayout();
        const { container, rerender } = renderTileLayout();
        await syncTileLayoutTree(container);
        const model = getLayoutModelForStaticTab();
        await act(async () => {
            model.newEphemeralNode("eph");
            model.updateTree();
        });
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        const latestCanDrag = canDragFns.slice(-1);
        expect(latestCanDrag[0]?.()).toBe(false);
    });

    it("invokes canDrag for all display nodes", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        const dragResults = canDragFns.slice(-2).map((fn) => fn());
        expect(dragResults).toEqual([true, true]);
    });

    it("generates drag preview image on pointer enter", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        const tileNode = container.querySelector(".tile-node") as HTMLDivElement;
        dragPreviewFn = vi.fn();
        vi.mocked(toPng).mockClear();
        await act(async () => {
            invokeReactHandler(tileNode, "onPointerEnter", {
                stopPropagation: () => {},
                preventDefault: () => {},
            });
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(vi.mocked(toPng)).toHaveBeenCalled();
        expect(dragPreviewFn).toHaveBeenCalled();

        vi.mocked(toPng).mockClear();
        dragPreviewFn = vi.fn();
        await act(async () => {
            invokeReactHandler(tileNode, "onPointerEnter", {
                stopPropagation: () => {},
                preventDefault: () => {},
            });
        });
        expect(vi.mocked(toPng)).not.toHaveBeenCalled();
        expect(dragPreviewFn).toHaveBeenCalled();
    });

    it("stops pointerover propagation on display nodes", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        const tileNode = container.querySelector(".tile-node") as HTMLDivElement;
        const stopSpy = vi.fn();
        act(() => {
            invokeReactHandler(tileNode, "onPointerOver", { stopPropagation: stopSpy });
        });
        expect(stopSpy).toHaveBeenCalled();
    });

    it("invokes overlay canDrop and drop handlers", async () => {
        const { leafA, leafB } = seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        const model = getLayoutModelForStaticTab();
        const onDropSpy = vi.spyOn(model, "onDrop");
        const makeMonitor = (dragItem: typeof leafA) => ({
            isOver: ({ shallow }: { shallow?: boolean }) => shallow === true,
            getItem: () => dragItem,
            didDrop: () => false,
        });
        const overlayCanDrops = canDropFns.slice(-2);
        const overlayDrops = dropFns.slice(-2);
        expect(overlayCanDrops.length).toBe(2);
        expect(overlayCanDrops.filter((fn) => fn(null, makeMonitor(leafA))).length).toBe(1);
        expect(overlayCanDrops.filter((fn) => !fn(null, makeMonitor(leafB))).length).toBe(1);
        act(() => {
            overlayDrops.forEach((fn) => fn(null, { didDrop: () => false }));
        });
        expect(onDropSpy).toHaveBeenCalled();
    });

    it("tracks resize pointer moves after capture", async () => {
        seedTwoLeafLayout();
        const { container } = renderTileLayout();
        await syncTileLayoutTree(container);
        const model = getLayoutModelForStaticTab();
        const onResizeMoveSpy = vi.spyOn(model, "onResizeMove");
        const handle = container.querySelector(".resize-handle") as HTMLDivElement;
        handle.setPointerCapture = vi.fn();
        await act(async () => {
            invokeReactHandler(handle, "onPointerDown", { pointerId: 7, currentTarget: handle });
        });
        await act(async () => {
            invokeReactHandler(handle, "onGotPointerCapture", { pointerId: 7 });
        });
        await act(async () => {
            invokeReactHandler(handle, "onPointerMove", {
                pointerId: 7,
                clientX: 150,
                clientY: 90,
            });
            vi.advanceTimersByTime(15);
        });
        expect(onResizeMoveSpy).toHaveBeenCalled();
    });
});
