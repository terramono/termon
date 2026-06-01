// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { atom } from "jotai";
import { assert, expect, test, vi } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection, LayoutTreeActionType } from "../lib/types";

const layoutStateAtom = atom<LayoutState>({
    rootnode: undefined,
    focusednodeid: undefined,
    magnifiednodeid: undefined,
});

vi.mock("../lib/layoutAtom", () => ({
    getLayoutStateAtomFromTab: () => layoutStateAtom,
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

function findLeaf(model: LayoutModel, blockId: string) {
    return model.treeState.rootNode?.children?.find((child) => child.data?.blockId === blockId) ?? model.treeState.rootNode;
}
