// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { assert, test } from "vitest";
import { newLayoutNode } from "../lib/layoutNode";
import {
    clearTree,
    computeMoveNode,
    deleteNode,
    focusNode,
    insertNode,
    insertNodeAtIndex,
    magnifyNodeToggle,
    moveNode,
    replaceNode,
    resizeNode,
    splitHorizontal,
    splitVertical,
    swapNode,
} from "../lib/layoutTree";
import {
    DropDirection,
    FlexDirection,
    LayoutTreeActionType,
    LayoutTreeComputeMoveNodeAction,
    LayoutTreeMoveNodeAction,
    LayoutTreeSwapNodeAction,
} from "../lib/types";
import { newLayoutTreeState } from "./model";

test("layoutTreeStateReducer - compute move", () => {
    const nodeA = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeA" });
    const node1 = newLayoutNode(undefined, undefined, undefined, { blockId: "node1" });
    const node2 = newLayoutNode(undefined, undefined, undefined, { blockId: "node2" });
    const treeState = newLayoutTreeState(newLayoutNode(undefined, undefined, [nodeA, node1, node2]));
    assert(treeState.rootNode.children!.length === 3, "root should have three children");
    let pendingAction = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: treeState.rootNode.id,
        nodeToMoveId: node1.id,
        direction: DropDirection.Bottom,
    });
    const insertOperation = pendingAction as LayoutTreeMoveNodeAction;
    assert(insertOperation.node === node1, "insert operation node should equal node1");
    assert(!insertOperation.parentId, "insert operation parent should not be defined");
    assert(insertOperation.index === 1, "insert operation index should equal 1");
    assert(insertOperation.insertAtRoot, "insert operation insertAtRoot should be true");
    moveNode(treeState, insertOperation);
    assert(
        treeState.rootNode.data == null && treeState.rootNode.children!.length === 3,
        "root node should still have three children"
    );
    assert(treeState.rootNode.children![1].data!.blockId === "node1", "root's second child should be node1");

    pendingAction = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: node1.id,
        nodeToMoveId: node2.id,
        direction: DropDirection.Bottom,
    });
    const insertOperation2 = pendingAction as LayoutTreeMoveNodeAction;
    assert(insertOperation2.node === node2, "insert operation node should equal node2");
    assert(insertOperation2.parentId === node1.id, "insert operation parent id should be node1 id");
    assert(insertOperation2.index === 1, "insert operation index should equal 1");
    assert(!insertOperation2.insertAtRoot, "insert operation insertAtRoot should be false");
    moveNode(treeState, insertOperation2);
    assert(
        treeState.rootNode.data == null && (treeState.rootNode.children!.length as number) === 2,
        "root node should now have two children after node2 moved into node1"
    );
    assert(treeState.rootNode.children![1].children!.length === 2, "root's second child should now have two children");
});

test("computeMove - noop action", () => {
    const nodeToMove = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeToMove" });
    const treeState = newLayoutTreeState(
        newLayoutNode(undefined, undefined, [
            nodeToMove,
            newLayoutNode(undefined, undefined, undefined, { blockId: "otherNode" }),
        ])
    );
    let moveAction: LayoutTreeComputeMoveNodeAction = {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: treeState.rootNode.id,
        nodeToMoveId: nodeToMove.id,
        direction: DropDirection.Left,
    };
    let pendingAction = computeMoveNode(treeState, moveAction);

    assert(pendingAction == null, "inserting a node to the left of itself should not produce a pendingAction");

    moveAction = {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: treeState.rootNode.id,
        nodeToMoveId: nodeToMove.id,
        direction: DropDirection.Right,
    };

    pendingAction = computeMoveNode(treeState, moveAction);
    assert(pendingAction == null, "inserting a node to the right of itself should not produce a pendingAction");
});

test("insertNode into empty tree sets root", () => {
    const treeState = newLayoutTreeState(null as any);
    treeState.rootNode = undefined;
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    insertNode(treeState, { type: LayoutTreeActionType.InsertNode, node, focused: true });
    assert.equal(treeState.rootNode?.id, node.id);
    assert.equal(treeState.focusedNodeId, node.id);
});

test("insertNode appends using findNextInsertLocation", () => {
    const existing = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "first" });
    const treeState = newLayoutTreeState(existing);
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "second" });
    insertNode(treeState, { type: LayoutTreeActionType.InsertNode, node });
    assert(treeState.rootNode.children != null);
    assert.equal(treeState.rootNode.children.length, 2);
});

test("deleteNode removes child and clears focus", () => {
    const child = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "child" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child]);
    const treeState = newLayoutTreeState(root);
    treeState.focusedNodeId = child.id;
    deleteNode(treeState, { type: LayoutTreeActionType.DeleteNode, nodeId: child.id });
    assert.equal(treeState.rootNode.children.length, 0);
    assert(treeState.focusedNodeId == null);
});

test("swapNode exchanges siblings and sizes", () => {
    const node1 = newLayoutNode(FlexDirection.Row, 30, undefined, { blockId: "n1" });
    const node2 = newLayoutNode(FlexDirection.Row, 70, undefined, { blockId: "n2" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [node1, node2]);
    const treeState = newLayoutTreeState(root);
    swapNode(treeState, { type: LayoutTreeActionType.Swap, node1Id: node1.id, node2Id: node2.id });
    assert.equal(treeState.rootNode.children[0].data!.blockId, "n2");
    assert.equal(treeState.rootNode.children[1].data!.blockId, "n1");
    assert.equal(node1.size, 70);
    assert.equal(node2.size, 30);
});

test("resizeNode updates node sizes", () => {
    const node = newLayoutNode(FlexDirection.Row, 50, undefined, { blockId: "n" });
    const treeState = newLayoutTreeState(node);
    resizeNode(treeState, {
        type: LayoutTreeActionType.ResizeNode,
        resizeOperations: [{ nodeId: node.id, size: 25 }],
    });
    assert.equal(treeState.rootNode.size, 25);
});

test("focusNode and magnifyNodeToggle", () => {
    const child = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "child" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child]);
    const treeState = newLayoutTreeState(root);
    focusNode(treeState, { type: LayoutTreeActionType.FocusNode, nodeId: child.id });
    assert.equal(treeState.focusedNodeId, child.id);
    magnifyNodeToggle(treeState, { type: LayoutTreeActionType.MagnifyNodeToggle, nodeId: child.id });
    assert.equal(treeState.magnifiedNodeId, child.id);
    magnifyNodeToggle(treeState, { type: LayoutTreeActionType.MagnifyNodeToggle, nodeId: child.id });
    assert(treeState.magnifiedNodeId == null);
});

test("clearTree resets state", () => {
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "n" });
    const treeState = newLayoutTreeState(node);
    treeState.focusedNodeId = node.id;
    treeState.magnifiedNodeId = node.id;
    clearTree(treeState);
    assert(treeState.rootNode == null);
    assert(treeState.focusedNodeId == null);
    assert(treeState.magnifiedNodeId == null);
});

test("replaceNode preserves size at root", () => {
    const oldNode = newLayoutNode(FlexDirection.Row, 42, undefined, { blockId: "old" });
    const treeState = newLayoutTreeState(oldNode);
    const newNode = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "new" });
    replaceNode(treeState, {
        type: LayoutTreeActionType.ReplaceNode,
        targetNodeId: oldNode.id,
        newNode,
        focused: true,
    });
    assert.equal(treeState.rootNode.id, newNode.id);
    assert.equal(treeState.rootNode.size, 42);
    assert.equal(treeState.focusedNodeId, newNode.id);
});

test("splitHorizontal wraps non-row parent", () => {
    const target = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "target" });
    const treeState = newLayoutTreeState(target);
    const newNode = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "new" });
    splitHorizontal(treeState, {
        type: LayoutTreeActionType.SplitHorizontal,
        targetNodeId: target.id,
        newNode,
        position: "after",
        focused: true,
    });
    assert.equal(treeState.rootNode.flexDirection, FlexDirection.Row);
    assert.equal(treeState.rootNode.children!.length, 2);
    assert.equal(treeState.focusedNodeId, newNode.id);
});

test("splitVertical splices into column parent", () => {
    const target = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "target" });
    const sibling = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "sibling" });
    const root = newLayoutNode(FlexDirection.Column, undefined, [target, sibling]);
    const treeState = newLayoutTreeState(root);
    const newNode = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "new" });
    splitVertical(treeState, {
        type: LayoutTreeActionType.SplitVertical,
        targetNodeId: target.id,
        newNode,
        position: "before",
    });
    assert.equal(treeState.rootNode.children!.length, 3);
    assert.equal(treeState.rootNode.children![0].id, newNode.id);
});

test("insertNodeAtIndex uses indexArr", () => {
    const child0 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c0" });
    const child1 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c1" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child0, child1]);
    const treeState = newLayoutTreeState(root);
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "inserted" });
    insertNodeAtIndex(treeState, {
        type: LayoutTreeActionType.InsertNodeAtIndex,
        node,
        indexArr: [0],
    });
    assert.equal(treeState.rootNode.children!.length, 3);
});

test("computeMove - left and right on row layout", () => {
    const nodeA = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeA" });
    const nodeB = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeB" });
    const nodeC = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeC" });
    const treeState = newLayoutTreeState(newLayoutNode(FlexDirection.Row, undefined, [nodeA, nodeB, nodeC]));

    const leftMove = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeB.id,
        nodeToMoveId: nodeC.id,
        direction: DropDirection.Left,
    }) as LayoutTreeMoveNodeAction;
    assert(leftMove.parentId === nodeB.id);
    assert.equal(leftMove.index, 0);

    const rightMove = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeA.id,
        nodeToMoveId: nodeC.id,
        direction: DropDirection.Right,
    }) as LayoutTreeMoveNodeAction;
    assert(rightMove.parentId === nodeA.id);
    assert.equal(rightMove.index, 1);
});

test("computeMove - center returns swap action", () => {
    const nodeA = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeA" });
    const nodeB = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeB" });
    const treeState = newLayoutTreeState(newLayoutNode(FlexDirection.Row, undefined, [nodeA, nodeB]));
    const swapAction = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeA.id,
        nodeToMoveId: nodeB.id,
        direction: DropDirection.Center,
    });
    assert(swapAction?.type === LayoutTreeActionType.Swap);
    assert.equal((swapAction as LayoutTreeSwapNodeAction).node1Id, nodeA.id);
    assert.equal((swapAction as LayoutTreeSwapNodeAction).node2Id, nodeB.id);
});

test("computeMove - returns undefined for missing nodes", () => {
    const nodeA = newLayoutNode(undefined, undefined, undefined, { blockId: "nodeA" });
    const treeState = newLayoutTreeState(nodeA);
    const action = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeA.id,
        nodeToMoveId: "missing-id",
        direction: DropDirection.Bottom,
    });
    assert(action == null);
});

test("computeMove - top and bottom on column layout", () => {
    const nodeA = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "nodeA" });
    const nodeB = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "nodeB" });
    const nodeC = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "nodeC" });
    const treeState = newLayoutTreeState(newLayoutNode(FlexDirection.Column, undefined, [nodeA, nodeB, nodeC]));

    const topMove = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeB.id,
        nodeToMoveId: nodeC.id,
        direction: DropDirection.Top,
    }) as LayoutTreeMoveNodeAction;
    assert.equal(topMove.parentId, nodeB.id);
    assert.equal(topMove.index, 0);

    const bottomMove = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: nodeA.id,
        nodeToMoveId: nodeC.id,
        direction: DropDirection.Bottom,
    }) as LayoutTreeMoveNodeAction;
    assert.equal(bottomMove.parentId, nodeA.id);
    assert.equal(bottomMove.index, 1);
});

test("computeMove - outer directions on nested layout", () => {
    const inner = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "inner" });
    const sibling = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "sibling" });
    const outer = newLayoutNode(FlexDirection.Column, undefined, [inner, sibling]);
    const mover = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "mover" });
    const root = newLayoutNode(FlexDirection.Column, undefined, [outer, mover]);
    const treeState = newLayoutTreeState(root);

    const outerTop = computeMoveNode(treeState, {
        type: LayoutTreeActionType.ComputeMove,
        nodeId: inner.id,
        nodeToMoveId: mover.id,
        direction: DropDirection.OuterTop,
    }) as LayoutTreeMoveNodeAction;
    assert.equal(outerTop.parentId, root.id);
    assert.equal(outerTop.index, 0);
});

test("moveNode reorders siblings under same parent", () => {
    const nodeA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const nodeB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const nodeC = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [nodeA, nodeB, nodeC]);
    const treeState = newLayoutTreeState(root);

    moveNode(treeState, {
        type: LayoutTreeActionType.Move,
        node: nodeC,
        parentId: root.id,
        index: 0,
    });
    assert.equal(treeState.rootNode.children![0].data!.blockId, "c");
    assert.equal(treeState.rootNode.children!.length, 3);
});

test("insertNode sets magnified and focused ids", () => {
    const existing = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "first" });
    const treeState = newLayoutTreeState(existing);
    const node = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "focused" });
    insertNode(treeState, {
        type: LayoutTreeActionType.InsertNode,
        node,
        focused: true,
        magnified: true,
    });
    assert.equal(treeState.focusedNodeId, node.id);
    assert.equal(treeState.magnifiedNodeId, node.id);
});

test("deleteNode leaves empty children on parent", () => {
    const child = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "only" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child]);
    const treeState = newLayoutTreeState(root);
    deleteNode(treeState, { type: LayoutTreeActionType.DeleteNode, nodeId: child.id });
    assert.equal(treeState.rootNode.children!.length, 0);
});

