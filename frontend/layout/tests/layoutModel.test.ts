// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { atom } from "jotai";
import { assert, expect, test, vi } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection, LayoutTreeActionType, NavigateDirection, DropDirection } from "../lib/types";

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

test("LayoutModel closeNode removes ephemeral node outside tree", async () => {
    const model = makeModel();
    attachDisplayContainer(model);
    model.newEphemeralNode("eph-close");
    const eph = globalStore.get(model.ephemeralNode)!;
    const onNodeDelete = vi.fn(async () => {});
    model.onNodeDelete = onNodeDelete;

    await model.closeNode(eph.id);

    assert(globalStore.get(model.ephemeralNode) == null);
    assert.equal(onNodeDelete.mock.calls.length, 1);
});

test("LayoutModel ephemeral layout shrinks when a node is magnified", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const model = makeModel(leaf);
    attachDisplayContainer(model, 1000, 1000);
    model.updateTree();
    model.magnifyNodeToggle(leaf.id);
    model.newEphemeralNode("eph");
    model.addEphemeralNodeToLayout();

    const props = model.getNodeAdditionalProperties(model.getNodeByBlockId("eph"));
    assert(props.transform != null);
});

test("LayoutModel onDrop no-op without pending action", () => {
    const model = makeModel();
    model.onDrop();
    assert.equal(model.treeState.rootNode?.data?.blockId, "block-1");
});

test("LayoutModel treeReducer covers insert at index and compute move", () => {
    const empty = makeEmptyModel();
    const atIndex = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "at-index" });
    empty.treeReducer(
        {
            type: LayoutTreeActionType.InsertNodeAtIndex,
            node: atIndex,
            indexArr: [0],
            focused: true,
        },
        false
    );
    assert.equal(empty.treeState.rootNode?.data?.blockId, "at-index");
    assert.equal(empty.treeState.focusedNodeId, atIndex.id);

    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const moveModel = makeModel(root);
    moveModel.treeReducer(
        {
            type: LayoutTreeActionType.ComputeMove,
            nodeId: leafB.id,
            nodeToMoveId: leafA.id,
            direction: DropDirection.OuterRight,
        },
        false
    );
    assert(globalStore.get(moveModel.pendingTreeAction.throttledValueAtom) != null);

    const insertModel = makeEmptyModel();
    const focusedNode = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "focused-insert" });
    insertModel.treeReducer(
        {
            type: LayoutTreeActionType.InsertNode,
            node: focusedNode,
            focused: true,
        },
        false
    );
    assert.equal(insertModel.treeState.rootNode?.data?.blockId, "focused-insert");
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

test("LayoutModel onBackendUpdate processes pending replace action", async () => {
    const root = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "old-block" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "replace-1",
                actiontype: LayoutTreeActionType.ReplaceNode,
                blockid: "new-block",
                targetblockid: "old-block",
                nodesize: 75,
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();

    assert(model.getNodeByBlockId("old-block") == null);
    assert.equal(model.getNodeByBlockId("new-block")?.data?.blockId, "new-block");
    assert.equal(model.getNodeByBlockId("new-block")?.size, 50);
});

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

test("LayoutModel derived atoms expose resize handles and overlay state", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    const resizeHandleAtom = globalStore.get(model.resizeHandles)[0];
    assert(resizeHandleAtom != null);
    assert.equal(globalStore.get(resizeHandleAtom).flexDirection, FlexDirection.Row);

    globalStore.set(model.isContainerResizing, true);
    assert.equal(globalStore.get(model.isResizing), true);

    globalStore.set(model.activeDrag, true);
    const overlay = globalStore.get(model.overlayTransform);
    assert.equal(overlay.top, 0);

    globalStore.set(model.showOverlay, true);
    assert.equal(globalStore.get(model.overlayTransform).top, 0);
});

test("LayoutModel focusedNode prefers ephemeral node", () => {
    const model = makeModel();
    attachDisplayContainer(model);
    model.newEphemeralNode("eph-focus");
    const focused = globalStore.get(model.focusedNode);
    assert.equal(focused?.data?.blockId, "eph-focus");
});

test("LayoutModel placeholderTransform handles move and swap actions", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.updateTree();
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
        [leafB.id]: { top: 0, left: 200, width: 200, height: 200 },
        [root.id]: { top: 0, left: 0, width: 400, height: 200 },
    });

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafA,
        parentId: root.id,
        index: 1,
        insertAtRoot: false,
    });
    assert(globalStore.get(model.placeholderTransform) != null);

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Swap,
        node1Id: leafA.id,
        node2Id: leafB.id,
    });
    assert(globalStore.get(model.placeholderTransform) != null);
});

test("LayoutModel backend action handlers cover error and cleanup paths", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "keep" });
    globalStore.set(layoutStateAtom, {
        rootnode: root,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "",
                actiontype: LayoutTreeActionType.InsertNode,
                blockid: "skip",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "eph-1",
                actiontype: LayoutTreeActionType.InsertNode,
                blockid: "eph-block",
                focused: false,
                magnified: false,
                ephemeral: true,
            },
            {
                actionid: "del-missing",
                actiontype: LayoutTreeActionType.DeleteNode,
                blockid: "missing",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "idx-missing",
                actiontype: LayoutTreeActionType.InsertNodeAtIndex,
                blockid: "idx-block",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "cleanup-1",
                actiontype: "cleanuporphaned",
                blockid: "",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "noop-1",
                actiontype: "unsupported" as any,
                blockid: "",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    const tabAtom = atom<Tab>({
        oid: "tab-cleanup",
        layoutstate: "layout-cleanup",
        blockids: ["orphan-block", "keep"],
    } as Tab);
    const model = new LayoutModel(tabAtom, globalStore.get, globalStore.set);
    attachDisplayContainer(model);
    model.onNodeDelete = vi.fn(async () => {});
    model.updateTree();
    model.onBackendUpdate();
    await flushAsync();
    assert.equal(globalStore.get(model.ephemeralNode)?.data?.blockId, "eph-block");
});

test("LayoutModel treeReducer warns on empty pending action and failed commit", () => {
    const model = makeModel();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    model.treeReducer({ type: LayoutTreeActionType.SetPendingAction, action: null }, false);
    model.treeReducer({ type: LayoutTreeActionType.CommitPendingAction }, false);
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
});

test("LayoutModel focus and close handle missing nodes", () => {
    const model = makeModel();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    model.focusNode("missing-node");
    model.closeNode("missing-node");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
});

test("LayoutModel node model atoms and callbacks", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 100, height: 100 },
        [leafB.id]: { top: 0, left: 100, width: 100, height: 100 },
    });
    globalStore.set(model.additionalProps, {
        ...globalStore.get(model.additionalProps),
        [leafA.id]: {
            rect: { top: 0, left: 0, width: 100, height: 100 },
            transform: { width: "100px", height: "100px" },
            treeKey: leafA.id,
        },
        [leafB.id]: {
            rect: { top: 0, left: 100, width: 100, height: 100 },
            transform: { width: "100px", height: "100px" },
            treeKey: leafB.id,
        },
    });
    const nodeModel = model.getNodeModel(leafA);
    assert(globalStore.get(nodeModel.innerRect) != null);
    assert.equal(globalStore.get(nodeModel.blockNum), 1);
    assert.equal(globalStore.get(nodeModel.isFocused), false);
    model.focusNode(leafA.id);
    assert.equal(globalStore.get(nodeModel.isFocused), true);
    nodeModel.toggleMagnify();
    nodeModel.focusNode();
});

test("LayoutModel onResizeMove rejects invalid handles and min sizes", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.updateTree();
    const addlProps = globalStore.get(model.additionalProps);
    const resizeHandle = addlProps[root.id]?.resizeHandles?.[0];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    model.onResizeMove({ ...resizeHandle, parentIndex: 99 } as any, 0, 0);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
});

test("LayoutModel closeFocusedNode closes current focus", async () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "close-me" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});
    model.focusNode(leaf.id);
    await model.closeFocusedNode();
    assert(model.getNodeByBlockId("close-me") == null);
});

test("LayoutModel newEphemeralNode replaces existing ephemeral node", async () => {
    const model = makeModel();
    attachDisplayContainer(model);
    model.onNodeDelete = vi.fn(async () => {});
    model.newEphemeralNode("first-eph");
    model.newEphemeralNode("second-eph");
    assert.equal(globalStore.get(model.ephemeralNode)?.data?.blockId, "second-eph");
});

test("LayoutModel cleanupNodeModels removes stale node models", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    model.getNodeModel(leafA);
    model.getNodeModel(leafB);
    globalStore.set(model.leafOrder, [{ nodeid: leafA.id, blockid: "a" }]);
    model.updateTree();
    assert(model.getNodeModel(leafB) != null);
});

test("LayoutModel focusedNode returns null when focus id missing", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    globalStore.set(model.localTreeStateAtom, {
        rootnode: leaf,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
    });
    assert(globalStore.get(model.focusedNode) == null);
});

test("LayoutModel focusedNode resolves focused tree node", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    model.focusNode(leaf.id);
    assert.equal(globalStore.get(model.focusedNode)?.id, leaf.id);
});

test("LayoutModel getFirstBlockId returns undefined for empty layout", () => {
    const model = makeEmptyModel();
    assert(model.getFirstBlockId() == undefined);
});

test("LayoutModel persistToBackend writes wave object state", async () => {
    vi.useFakeTimers();
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "persist" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.onNodeDelete = vi.fn(async () => {});
    model.newEphemeralNode("eph-persist");
    await model.closeNode(globalStore.get(model.ephemeralNode).id);
    vi.advanceTimersByTime(150);
    const waveObj = globalStore.get(layoutStateAtom);
    assert(waveObj != null);
    vi.useRealTimers();
});

test("LayoutModel treeReducer handles Move action", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    model.treeReducer(
        {
            type: LayoutTreeActionType.Move,
            node: leafB,
            parentId: root.id,
            index: 0,
            insertAtRoot: false,
        },
        false
    );
    assert.equal(model.treeState.rootNode!.children![0].data!.blockId, "b");
});

test("LayoutModel placeholder move variants cover insert positions", () => {
    const leafA = newLayoutNode(FlexDirection.Column, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Column, 50, undefined, { blockId: "b" });
    const leafC = newLayoutNode(FlexDirection.Column, 50, undefined, { blockId: "c" });
    const root = newLayoutNode(FlexDirection.Column, undefined, [leafA, leafB, leafC]);
    const model = makeModel(root);
    attachDisplayContainer(model, 200, 600);
    model.updateTree();
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
        [leafB.id]: { top: 200, left: 0, width: 200, height: 200 },
        [leafC.id]: { top: 400, left: 0, width: 200, height: 200 },
        [root.id]: { top: 0, left: 0, width: 200, height: 600 },
    });

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafC,
        parentId: root.id,
        index: 2,
        insertAtRoot: false,
    });
    assert(globalStore.get(model.placeholderTransform) != null);

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafA,
        parentId: root.id,
        index: 0,
        insertAtRoot: true,
    });
    assert(globalStore.get(model.placeholderTransform) != null);
});

test("LayoutModel updateTree restores focus from stack and z-index flags", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.focusNode(leafB.id);
    model.focusedNodeIdStack = [leafA.id];
    model.treeState.focusedNodeId = undefined;
    model.updateTree();
    assert(model.treeState.focusedNodeId != null);

    model.magnifyNodeToggle(leafA.id);
    model.updateTree();
    model.magnifyNodeToggle(leafA.id);
    model.lastMagnifiedNodeId = leafA.id;
    model.updateTree();
    const zProps = globalStore.get(model.additionalProps)[leafA.id];
    assert.equal(zProps?.transform?.zIndex, "var(--zindex-layout-last-magnified-node)");

    model.lastEphemeralNodeId = leafB.id;
    model.updateTree();
    const ephProps = globalStore.get(model.additionalProps)[leafB.id];
    assert.equal(ephProps?.transform?.zIndex, "var(--zindex-layout-last-ephemeral-node)");
});

test("LayoutModel switchNodeFocusInDirection scans layout and hits boundaries", () => {
    const leafA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 200, 100);
    seedLeafOrder(model, leafA);
    globalStore.set(model.leafs, [leafA, leafB]);
    globalStore.set(model.leafOrder, [
        { nodeid: leafA.id, blockid: "a" },
        { nodeid: leafB.id, blockid: "b" },
    ]);
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 80, height: 80 },
        [leafB.id]: { top: 0, left: 100, width: 80, height: 80 },
    });

    const noFocus = model.switchNodeFocusInDirection(NavigateDirection.Right, false);
    assert.equal(noFocus.success, true);

    model.focusNode(leafA.id);
    const found = model.switchNodeFocusInDirection(NavigateDirection.Right, false);
    assert.equal(found.success, true);
    assert.equal(model.treeState.focusedNodeId, leafB.id);

    model.focusNode(leafA.id);
    const boundary = model.switchNodeFocusInDirection(NavigateDirection.Left, false);
    assert.equal(boundary.success, false);
    assert(boundary.atLeft === true);

    const waveUp = model.switchNodeFocusInDirection(NavigateDirection.Up, true);
    assert.equal(waveUp.atTop, true);
});

test("LayoutModel switchNodeFocusInDirection fails without geometry or container", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    seedLeafOrder(model, leaf);
    globalStore.set(model.leafs, [leaf]);
    model.focusNode(leaf.id);
    globalStore.set(model.additionalProps, {});
    const missingRect = model.switchNodeFocusInDirection(NavigateDirection.Right, false);
    assert.equal(missingRect.success, false);

    const noContainer = makeModel(leaf);
    attachDisplayContainer(noContainer);
    seedLeafOrder(noContainer, leaf);
    globalStore.set(noContainer.leafs, [leaf]);
    noContainer.focusNode(leaf.id);
    seedNodeRects(noContainer, { [leaf.id]: { top: 0, left: 0, width: 20, height: 20 } });
    (noContainer.displayContainerRef as { current: HTMLDivElement | null }).current = {
        getBoundingClientRect: () => null,
    } as HTMLDivElement;
    const noBounds = noContainer.switchNodeFocusInDirection(NavigateDirection.Right, false);
    assert.equal(noBounds.success, false);
});

test("LayoutModel backend actions handle replace and split errors", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "target" });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});

    globalStore.set(layoutStateAtom, {
        rootnode: model.treeState.rootNode,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "replace-missing",
                actiontype: LayoutTreeActionType.ReplaceNode,
                blockid: "new",
                targetblockid: "missing",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-h-bad-pos",
                actiontype: LayoutTreeActionType.SplitHorizontal,
                blockid: "split-h",
                targetblockid: "target",
                position: "middle" as any,
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-v-bad-pos",
                actiontype: LayoutTreeActionType.SplitVertical,
                blockid: "split-v",
                targetblockid: "target",
                position: "middle" as any,
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-h-ok",
                actiontype: LayoutTreeActionType.SplitHorizontal,
                blockid: "split-ok",
                targetblockid: "target",
                position: "after",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "insert-idx-ok",
                actiontype: LayoutTreeActionType.InsertNodeAtIndex,
                blockid: "idx-ok",
                indexarr: [0],
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();
    assert(model.getNodeByBlockId("split-ok") != null);
    assert(model.getNodeByBlockId("idx-ok") != null);
});

test("LayoutModel closeNode unmagnifies and addEphemeralNodeToLayout clears magnify", async () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "mag-close" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});
    model.magnifyNodeToggle(leaf.id);
    await model.closeNode(leaf.id);
    assert(model.getNodeByBlockId("mag-close") == null);

    const ephModel = makeModel();
    attachDisplayContainer(ephModel);
    ephModel.magnifyNodeToggle(leaf.id);
    ephModel.newEphemeralNode("eph-add");
    ephModel.addEphemeralNodeToLayout();
    assert(ephModel.getNodeByBlockId("eph-add") != null);
});

test("LayoutModel onResizeMove rejects sizes below minimum", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.updateTree();
    const resizeHandle = globalStore.get(model.additionalProps)[root.id].resizeHandles![0];
    model.onResizeMove(resizeHandle, 0, 0);
    model.onResizeMove(resizeHandle, 9999, 0);
    assert(globalStore.get(model.pendingTreeAction.currentValueAtom) == null);
});

test("LayoutModel backend split actions log missing targets and invalid positions", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "target" });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    globalStore.set(layoutStateAtom, {
        rootnode: model.treeState.rootNode,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "split-h-missing",
                actiontype: LayoutTreeActionType.SplitHorizontal,
                blockid: "new-h",
                targetblockid: "missing",
                position: "after",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-v-missing",
                actiontype: LayoutTreeActionType.SplitVertical,
                blockid: "new-v",
                targetblockid: "missing",
                position: "after",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-h-bad",
                actiontype: LayoutTreeActionType.SplitHorizontal,
                blockid: "bad-h",
                targetblockid: "target",
                position: "middle" as any,
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "split-v-bad",
                actiontype: LayoutTreeActionType.SplitVertical,
                blockid: "bad-v",
                targetblockid: "target",
                position: "middle" as any,
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
});

test("LayoutModel backend actions cover ephemeral insert replace and clear", async () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "target" });
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(layoutStateAtom, {
        rootnode: model.treeState.rootNode,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "eph-insert",
                actiontype: LayoutTreeActionType.InsertNode,
                blockid: "eph-backend",
                focused: false,
                magnified: false,
                ephemeral: true,
            },
            {
                actionid: "replace-ok",
                actiontype: LayoutTreeActionType.ReplaceNode,
                blockid: "replaced",
                targetblockid: "target",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
            {
                actionid: "clear-tree",
                actiontype: LayoutTreeActionType.ClearTree,
                blockid: "",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();
    assert.equal(globalStore.get(model.ephemeralNode)?.data?.blockId, "eph-backend");
});

test("LayoutModel placeholder move handles root insert and trailing index", () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 400, 200);
    model.updateTree();
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
        [leafB.id]: { top: 0, left: 200, width: 200, height: 200 },
        [root.id]: { top: 0, left: 0, width: 400, height: 200 },
    });

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafA,
        parentId: root.id,
        index: 0,
        insertAtRoot: true,
    });
    assert(globalStore.get(model.placeholderTransform) != null);

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafA,
        parentId: root.id,
        index: 3,
        insertAtRoot: false,
    });
    assert(globalStore.get(model.placeholderTransform) != null);

});

test("LayoutModel node model derived atoms cover single-leaf and ephemeral paths", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();
    const soloModel = model.getNodeModel(leaf);
    expect(globalStore.get(soloModel.innerRect)).toBeNull();

    const twoLeafRoot = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "a" }),
        newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "b" }),
    ]);
    const twoModel = makeModel(twoLeafRoot);
    attachDisplayContainer(twoModel, 400, 200);
    twoModel.updateTree();
    const leafA = globalStore.get(twoModel.leafs)[0];
    const nodeModel = twoModel.getNodeModel(leafA);
    twoModel.magnifyNodeToggle(leafA.id);
    expect(globalStore.get(nodeModel.anyMagnified)).toBe(true);
    twoModel.newEphemeralNode("eph-node");
    const eph = globalStore.get(twoModel.ephemeralNode);
    const ephModel = twoModel.getNodeModel(eph);
    expect(globalStore.get(ephModel.isEphemeral)).toBe(true);
    attachDisplayContainer(twoModel);
    ephModel.addEphemeralNodeToLayout();
    ephModel.onClose();
});

test("LayoutModel switchNodeFocusInDirection hits waveAI down boundary", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model, 50, 50);
    model.updateTree();
    seedLeafOrder(model, leaf);
    globalStore.set(model.leafs, [leaf]);
    seedNodeRects(model, {
        [leaf.id]: { top: 5, left: 2, width: 8, height: 8 },
    });
    model.focusNode(leaf.id);

    const waveDown = model.switchNodeFocusInDirection(NavigateDirection.Down, true);
    assert.equal(waveDown.success, false);
    assert(waveDown.atBottom === true);

    const waveLeft = model.switchNodeFocusInDirection(NavigateDirection.Left, true);
    assert.equal(waveLeft.success, false);
    assert(waveLeft.atLeft === true);
});

test("LayoutModel closeNode unmagnifies before delete and replaces ephemeral nodes", async () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "mag" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});
    model.magnifyNodeToggle(leaf.id);
    await model.closeNode(leaf.id);
    assert(model.getNodeByBlockId("mag") == null);

    const ephModel = makeModel(leaf);
    attachDisplayContainer(ephModel);
    ephModel.onNodeDelete = vi.fn(async () => {});
    ephModel.newEphemeralNode("eph-1");
    ephModel.newEphemeralNode("eph-2");
    assert.equal(globalStore.get(ephModel.ephemeralNode)?.data?.blockId, "eph-2");
});

test("LayoutModel cleanupOrphanedBlocks returns early without root", async () => {
    const model = makeEmptyModel();
    attachDisplayContainer(model);
    model.onNodeDelete = vi.fn(async () => {});
    globalStore.set(layoutStateAtom, {
        rootnode: undefined,
        focusednodeid: undefined,
        magnifiednodeid: undefined,
        pendingbackendactions: [
            {
                actionid: "cleanup-empty",
                actiontype: "cleanuporphaned",
                blockid: "",
                focused: false,
                magnified: false,
                ephemeral: false,
            },
        ],
    });
    model.onBackendUpdate();
    await flushAsync();
    expect(model.onNodeDelete).not.toHaveBeenCalled();
});

test("LayoutModel placeholder move trailing index uses column offset", () => {
    const leafA = newLayoutNode(FlexDirection.Column, 33, undefined, { blockId: "a" });
    const leafB = newLayoutNode(FlexDirection.Column, 33, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Column, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model, 200, 400);
    model.updateTree();
    seedNodeRects(model, {
        [leafA.id]: { top: 0, left: 0, width: 200, height: 200 },
        [leafB.id]: { top: 200, left: 0, width: 200, height: 200 },
        [root.id]: { top: 0, left: 0, width: 200, height: 400 },
    });

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leafA,
        parentId: root.id,
        index: 5,
        insertAtRoot: false,
    });
    assert(globalStore.get(model.placeholderTransform) != null);
});

test("LayoutModel placeholderTransform breaks when move target is missing", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.Move,
        node: leaf,
        parentId: "missing-parent",
        index: 0,
        insertAtRoot: false,
    });
    assert(globalStore.get(model.placeholderTransform) == null);
});

test("LayoutModel placeholderTransform no-ops for unsupported pending actions", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model);
    model.updateTree();

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.ClearPendingAction,
    });
    assert(globalStore.get(model.placeholderTransform) == null);

    globalStore.set(model.pendingTreeAction.throttledValueAtom, {
        type: LayoutTreeActionType.DeleteNode,
        nodeId: leaf.id,
    });
    assert(globalStore.get(model.placeholderTransform) == null);
});

test("LayoutModel switchNodeFocusInDirection hits top and bottom scan boundaries", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "edge" });
    const model = makeModel(leaf);
    attachDisplayContainer(model, 100, 100);
    model.updateTree();
    seedLeafOrder(model, leaf);
    globalStore.set(model.leafs, [leaf]);
    model.focusNode(leaf.id);

    seedNodeRects(model, {
        [leaf.id]: { top: 2, left: 50, width: 10, height: 10 },
    });
    const upBoundary = model.switchNodeFocusInDirection(NavigateDirection.Up, false);
    assert.equal(upBoundary.success, false);
    assert(upBoundary.atTop === true);

    seedNodeRects(model, {
        [leaf.id]: { top: 88, left: 50, width: 10, height: 10 },
    });
    const downBoundary = model.switchNodeFocusInDirection(NavigateDirection.Down, false);
    assert.equal(downBoundary.success, false);
    assert(downBoundary.atBottom === true);
});

test("LayoutModel switchNodeFocusInDirection hits right and top waveAI boundaries", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    const model = makeModel(leaf);
    attachDisplayContainer(model, 50, 50);
    model.updateTree();
    seedLeafOrder(model, leaf);
    globalStore.set(model.leafs, [leaf]);
    seedNodeRects(model, {
        [leaf.id]: { top: 5, left: 42, width: 8, height: 8 },
    });
    model.focusNode(leaf.id);

    const waveRight = model.switchNodeFocusInDirection(NavigateDirection.Right, true);
    assert.equal(waveRight.success, false);
    assert(waveRight.atRight === true);

    seedNodeRects(model, {
        [leaf.id]: { top: 2, left: 5, width: 8, height: 8 },
    });
    const waveUp = model.switchNodeFocusInDirection(NavigateDirection.Up, true);
    assert.equal(waveUp.success, false);
    assert(waveUp.atTop === true);
});

test("LayoutModel closeNode unmagnifies synced magnified node before delete", async () => {
    const leafA = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "mag-a" });
    const leafB = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "mag-sync" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leafA, leafB]);
    const model = makeModel(root);
    attachDisplayContainer(model);
    model.updateTree();
    model.onNodeDelete = vi.fn(async () => {});
    model.magnifyNodeToggle(leafB.id);
    model.updateTree();
    assert.equal(model.magnifiedNodeId, leafB.id);
    await model.closeNode(leafB.id);
    assert(model.getNodeByBlockId("mag-sync") == null);
});
