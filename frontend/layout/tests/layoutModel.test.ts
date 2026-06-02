// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { atom } from "jotai";
import { assert, expect, test, vi } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection, LayoutTreeActionType, NavigateDirection } from "../lib/types";

const layoutStateAtom = atom<LayoutState>({
    rootnode: undefined,
    focusednodeid: undefined,
    magnifiednodeid: undefined,
});
const magnifiedBlockSizeAtom = atom(0.85);

vi.mock("../lib/layoutAtom", () => ({
    getLayoutStateAtomFromTab: () => layoutStateAtom,
}));

vi.mock("@/app/store/global", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/store/global")>();
    return {
        ...actual,
        getSettingsKeyAtom: () => magnifiedBlockSizeAtom,
    };
});

vi.mock("@/app/store/wos", () => ({
    setObjectValue: vi.fn(),
}));

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

import { BlockService } from "@/app/store/services";
import { globalStore } from "@/app/store/jotaiStore";
import { LayoutModel } from "../lib/layoutModel";

function makeTabAtom(blockIds: string[] = []) {
    return atom<Tab>({
        oid: "tab-test-1",
        layoutstate: "layout-test-1",
        blockids: blockIds,
    } as Tab);
}

function makeModel(initialRoot?: LayoutNode) {
    const root = initialRoot ?? newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "block-1" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    return new LayoutModel(makeTabAtom(), globalStore.get, globalStore.set);
}

function makeEmptyModel() {
    globalStore.set(layoutStateAtom, {
        rootnode: undefined,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    return new LayoutModel(makeTabAtom(), globalStore.get, globalStore.set);
}

function seedLeafOrder(model: LayoutModel, leaf: LayoutNode) {
    globalStore.set(model.leafs, [leaf]);
    globalStore.set(model.leafOrder, [{ nodeid: leaf.id, blockid: leaf.data!.blockId! }]);
}

function attachDisplayContainer(model: LayoutModel, width = 800, height = 600) {
    (model.displayContainerRef as { current: HTMLDivElement }).current = {
        getBoundingClientRect: () => ({
            top: 0,
            left: 0,
            width,
            height,
            right: width,
            bottom: height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    } as HTMLDivElement;
}

function seedNodeRects(model: LayoutModel, rects: Record<string, { top: number; left: number; width: number; height: number }>) {
    const addlProps: Record<string, LayoutNodeAdditionalProps> = {};
    for (const [nodeId, rect] of Object.entries(rects)) {
        addlProps[nodeId] = { rect, treeKey: nodeId };
    }
    globalStore.set(model.additionalProps, addlProps);
}

async function flushAsync() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

test("LayoutModel initializes tree state from wave object", () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "init-block" });
    const model = makeModel(root);
    assert.equal(model.treeState.rootNode?.data?.blockId, "init-block");
});

test("LayoutModel treeReducer inserts and clears nodes", () => {
    const model = makeEmptyModel();
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "inserted" });
    model.treeReducer(
        {
            type: LayoutTreeActionType.InsertNode,
            node,
            focused: false,
        },
        false
    );
    assert.equal(model.treeState.rootNode?.data?.blockId, "inserted");

    model.treeReducer({ type: LayoutTreeActionType.ClearTree }, false);
    assert(model.treeState.rootNode == null);
});

test("LayoutModel treeReducer handles swap split and resize", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 40, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 60, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);

    model.treeReducer(
        {
            type: LayoutTreeActionType.Swap,
            node1Id: leafA.id,
            node2Id: leafB.id,
        },
        false
    );
    assert.equal(model.treeState.rootNode!.children![0].data!.blockId, "b");

    const newNode = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "split" });
    model.treeReducer(
        {
            type: LayoutTreeActionType.SplitHorizontal,
            targetNodeId: leafB.id,
            newNode,
            position: "after",
            focused: false,
        },
        false
    );
    assert(model.treeState.rootNode!.children!.length >= 2);

    model.treeReducer(
        {
            type: LayoutTreeActionType.ResizeNode,
            resizeOperations: [{ nodeId: leafA.id, size: 30 }],
        },
        false
    );
    assert.equal(findLeaf(model, "a")?.size, 30);
});

test("LayoutModel getNodeByBlockId and getFirstBlockId", () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "first-block" });
    const model = makeModel(root);
    seedLeafOrder(model, root);

    assert.equal(model.getNodeByBlockId("first-block")?.id, root.id);
    assert(model.getNodeByBlockId("missing") == null);
    assert.equal(model.getFirstBlockId(), "first-block");
});

test("LayoutModel focusNode and switchNodeFocusByBlockNum", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    seedLeafOrder(model, leafA);
    globalStore.set(model.leafOrder, [
        { nodeid: leafA.id, blockid: "a" },
        { nodeid: leafB.id, blockid: "b" },
    ]);

    model.focusNode(leafB.id);
    assert.equal(model.treeState.focusedNodeId, leafB.id);

    model.focusNode(leafB.id);
    assert.equal(model.treeState.focusedNodeId, leafB.id);

    model.switchNodeFocusByBlockNum(1);
    assert.equal(model.treeState.focusedNodeId, leafA.id);

    model.switchNodeFocusByBlockNum(99);
    assert.equal(model.treeState.focusedNodeId, leafA.id);
});

test("LayoutModel getNodeModel returns cached node models", () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "cached" });
    const model = makeModel(root);
    const first = model.getNodeModel(root);
    const second = model.getNodeModel(root);
    assert.equal(first, second);
    assert.equal(first.blockId, "cached");
});

test("LayoutModel registerTileLayout wires callbacks and cleanup", () => {
    const model = makeModel();
    const onNodeDelete = vi.fn(async () => {});
    model.registerTileLayout({
        renderContent: () => null,
        renderPreview: () => null,
        onNodeDelete,
        gapSizePx: 8,
    });
    assert.equal(globalStore.get(model.gapSizePx), 8);
    expect(BlockService.CleanupOrphanedBlocks).toHaveBeenCalledWith("tab-test-1");
});

test("LayoutModel magnifyNodeToggle and pending action reducers", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);

    model.magnifyNodeToggle(leafA.id, false);
    assert.equal(model.treeState.magnifiedNodeId, leafA.id);

    model.magnifyNodeToggle(leafA.id, false);
    assert(model.treeState.magnifiedNodeId == null);

    model.treeReducer({ type: LayoutTreeActionType.ClearPendingAction }, false);
    model.treeReducer({ type: LayoutTreeActionType.CommitPendingAction }, false);

    model.treeReducer({ type: "invalid" as any }, false);
});

test("LayoutModel getNodeAdditionalProperties helpers", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const model = makeModel(leafA);
    assert(model.getNodeAdditionalPropertiesById(leafA.id) == null);
    assert(model.getNodeAdditionalProperties(leafA) == null);
    assert(model.getNodeTransformById("missing") == null);
    assert(model.getNodeRectById("missing") == null);
});

test("LayoutModel onBackendUpdate is noop without pending actions", () => {
    const model = makeModel();
    model.onBackendUpdate();
    assert(model.treeState.rootNode?.data?.blockId === "block-1");
});

test("LayoutModel updateTree populates leafs and resize handles", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);

    model.updateTree();

    assert.equal(globalStore.get(model.leafs).length, 2);
    assert.equal(globalStore.get(model.leafOrder).length, 2);
    const addlProps = globalStore.get(model.additionalProps);
    assert(addlProps[root.id]?.resizeHandles?.length === 1);
});

test("LayoutModel onContainerResize refreshes tree layout", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);

    model.onContainerResize();

    assert.equal(globalStore.get(model.leafOrder).length, 2);
});

test("LayoutModel closeNode removes leaf and invokes onNodeDelete", async () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    const onNodeDelete = vi.fn(async () => {});
    model.onNodeDelete = onNodeDelete;

    await model.closeNode(leafA.id);

    assert(model.getNodeByBlockId("a") == null);
    expect(onNodeDelete).toHaveBeenCalledWith(leafA.data);
});

test("LayoutModel closeNode clears ephemeral node", async () => {
    const model = makeModel();
    attachDisplayContainer(model);
    const onNodeDelete = vi.fn(async () => {});
    model.onNodeDelete = onNodeDelete;

    model.newEphemeralNode("ephemeral-block");
    const ephemeral = globalStore.get(model.ephemeralNode);
    assert(ephemeral != null);

    await model.closeNode(ephemeral.id);

    assert(globalStore.get(model.ephemeralNode) == null);
    expect(onNodeDelete).toHaveBeenCalledWith(ephemeral.data);
});

test("LayoutModel processes backend insert action on init", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "existing" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "insert-1",
                actiontype: LayoutTreeActionType.InsertNode,
                blockid: "backend-block",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    const model = new LayoutModel(makeTabAtom(), globalStore.get, globalStore.set);
    attachDisplayContainer(model);
    await flushAsync();

    assert.equal(model.getNodeByBlockId("backend-block")?.data?.blockId, "backend-block");
});

test("LayoutModel onBackendUpdate processes pending delete action", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "to-delete" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});

    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "delete-1",
                actiontype: LayoutTreeActionType.DeleteNode,
                blockid: "to-delete",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();

    assert(model.getNodeByBlockId("to-delete") == null);
});

test("LayoutModel switchNodeFocusInDirection moves focus between leafs", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    seedLeafOrder(model, leafA);
    globalStore.set(model.leafOrder, [
        { nodeid: leafA.id, blockid: "a" },
        { nodeid: leafB.id, blockid: "b" },
    ]);
    globalStore.set(model.leafs, [leafA, leafB]);
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
        [leafB.id]: { top: 0, left: 200, width: 200, height: 200 },
    });
    model.focusNode(leafA.id);

    const result = model.switchNodeFocusInDirection(NavigateDirection.Right, false);

    assert.equal(result.success, true);
    assert.equal(model.treeState.focusedNodeId, leafB.id);
});

test("LayoutModel switchNodeFocusInDirection from WaveAI blocks non-right directions", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const model = makeModel(leafA);
    attachDisplayContainer(model);
    seedLeafOrder(model, leafA);
    globalStore.set(model.leafs, [leafA]);
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
    });
    model.focusNode(leafA.id);

    const upResult = model.switchNodeFocusInDirection(NavigateDirection.Up, true);
    assert.equal(upResult.success, false);
    assert(upResult.atTop === true);

    const leftResult = model.switchNodeFocusInDirection(NavigateDirection.Left, true);
    assert.equal(leftResult.success, false);
    assert(leftResult.atLeft === true);
});

test("LayoutModel ephemeral node lifecycle", async () => {
    const model = makeModel();
    attachDisplayContainer(model);

    model.newEphemeralNode("preview-block");
    assert.equal(globalStore.get(model.ephemeralNode)?.data?.blockId, "preview-block");

    model.addEphemeralNodeToLayout();
    assert(globalStore.get(model.ephemeralNode) == null);
    assert.equal(model.getNodeByBlockId("preview-block")?.data?.blockId, "preview-block");
});

test("LayoutModel focusFirstNode and onTreeStateAtomUpdated", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    model.focusFirstNode();
    assert.equal(model.treeState.focusedNodeId, leafA.id);

    model.treeState.focusedNodeId = leafB.id;
    model.onTreeStateAtomUpdated(true);
    assert.equal(globalStore.get(model.leafOrder).length, 2);
});

test("LayoutModel onDrop commits pending swap action", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    model.treeReducer(
        {
            type: LayoutTreeActionType.SetPendingAction,
            action: {
                type: LayoutTreeActionType.Swap,
                node1Id: leafA.id,
                node2Id: leafB.id,
            },
        },
        false
    );

    model.onDrop();

    assert.equal(model.treeState.rootNode!.children![0].data!.blockId, "b");
});

test("LayoutModel onResizeMove updates pending resize action", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.updateTree();

    const addlProps = globalStore.get(model.additionalProps);
    const resizeHandle = addlProps[root.id].resizeHandles![0];
    model.onResizeMove(resizeHandle, 210, 100);
    model.onResizeEnd();

    assert(globalStore.get(model.pendingTreeAction.currentValueAtom) == null);
});

test("LayoutModel processes backend split horizontal action", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "target" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(layoutStateAtom, {
        rootnode: model.treeState.rootNode,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "split-1",
                actiontype: LayoutTreeActionType.SplitHorizontal,
                blockid: "split-block",
                targetblockid: "target",
                position: "after",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();

    assert.equal(model.getNodeByBlockId("split-block")?.data?.blockId, "split-block");
});

test("LayoutModel processes backend split vertical action", async () => {
    const root = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "target" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(layoutStateAtom, {
        rootnode: model.treeState.rootNode,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "split-v-1",
                actiontype: LayoutTreeActionType.SplitVertical,
                blockid: "split-block-v",
                targetblockid: "target",
                position: "before",
                focused: true,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();

    assert.equal(model.getNodeByBlockId("split-block-v")?.data?.blockId, "split-block-v");
});

test("LayoutModel onResizeEnd no-op without active resize context", () => {
    const model = makeModel();
    model.onResizeEnd();
    assert.equal(model.treeState.rootNode?.data?.blockId, "block-1");
});

function findLeaf(model: LayoutModel, blockId: string) {
    return model.treeState.rootNode?.children?.find((child) => child.data?.blockId === blockId) ?? model.treeState.rootNode;
}

test("LayoutModel geometry getters read additional props", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "geo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();

    const rect = { top: 1, left: 2, width: 100, height: 50 };
    const transform = { transform: "translate3d(2px,1px, 0)" };
    globalStore.set(model.additionalProps, {
        [leaf.id]: { rect, transform, treeKey: leaf.id },
    });

    assert.equal(model.getNodeRect(leaf).width, 100);
    assert.equal(model.getNodeRectById(leaf.id).height, 50);
    assert.equal(model.getNodeTransform(leaf).transform, "translate3d(2px,1px, 0)");
    assert.equal(model.getNodeAdditionalPropertiesById(leaf.id).treeKey, leaf.id);
    assert.equal(globalStore.get(model.getNodeAdditionalPropertiesAtom(leaf.id)).rect.left, 2);
});
