// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { assert, test } from "vitest";
import { addChildAt, addIntermediateNode, balanceNode, findNextInsertLocation, newLayoutNode } from "../lib/layoutNode";
import {
    findInsertLocationFromIndexArr,
    findNode,
    findParent,
    removeChild,
    validateNode,
    walkNodes,
} from "../lib/layoutNode";
import { FlexDirection, LayoutNode } from "../lib/types";

test("newLayoutNode defaults flex direction to row", () => {
    const node = newLayoutNode(undefined, undefined, undefined, { blockId: "default-flex" });
    assert.equal(node.flexDirection, FlexDirection.Row);
});

test("newLayoutNode", () => {
    assert.throws(
        () => newLayoutNode(FlexDirection.Column),
        "Invalid node",
        undefined,
        "calls to the constructor without data or children should fail"
    );
    assert.throws(
        () => newLayoutNode(FlexDirection.Column, undefined, [], { blockId: "hello" }),
        "Invalid node",
        undefined,
        "calls to the constructor with both data and children should fail"
    );
    assert.doesNotThrow(
        () => newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "hello" }),
        "Invalid node",
        undefined,
        "calls to the constructor with only data defined should succeed"
    );
    assert.throws(
        () => newLayoutNode(FlexDirection.Column, undefined, [], undefined),
        "Invalid node",
        undefined,
        "calls to the constructor with empty children array should fail"
    );
    assert.doesNotThrow(
        () =>
            newLayoutNode(
                FlexDirection.Column,
                undefined,
                [newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "hello" })],
                undefined
            ),
        "Invalid node",
        undefined,
        "calls to the constructor with children array containing at least one child should succeed"
    );
});

test("addIntermediateNode", () => {
    const node1: LayoutNode = newLayoutNode(FlexDirection.Column, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "hello" }),
    ]);
    assert(node1.children![0].data!.blockId === "hello", "node1 should have one child which should have data");
    const intermediateNode1 = addIntermediateNode(node1);
    assert(
        node1.children != null && node1.children.length === 1 && node1.children?.includes(intermediateNode1),
        "node1 should have a single child intermediateNode1"
    );
    assert(intermediateNode1.flexDirection === FlexDirection.Row, "intermediateNode1 should have flexDirection Row");
    assert(
        intermediateNode1.children![0].children![0].data!.blockId === "hello" &&
            intermediateNode1.children![0].children![0].flexDirection === FlexDirection.Row,
        "intermediateNode1 should have a nested child which should have data and flexDirection Row"
    );
    const node2: LayoutNode = newLayoutNode(FlexDirection.Column, undefined, undefined, {
        blockId: "hello",
    });
    const intermediateNode2 = addIntermediateNode(node2);
    assert(
        node2.children != null &&
            node2.data == null &&
            node2.children.length === 1 &&
            node2.children.includes(intermediateNode2),
        "node2 should have no data and a single child intermediateNode2"
    );
    assert(
        intermediateNode2.data.blockId === "hello" && intermediateNode2.children == null,
        "intermediateNode2 should have no children and should have data matching the old value of node2"
    );
});

test("addChildAt - same flexDirection, no children", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" });
    const node2 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node2" });
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(node1.children![1].id === node2.id, "node1's second child should be node2");
    assert(node1.children![1].flexDirection === FlexDirection.Column, "node2 should now have flexDirection Column");
});

test("addChildAt - different flexDirection, no children", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" });
    const node2 = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node2" });
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have flexDirection Column");
    assert(node1.children![1].id === node2.id, "node1's second child should be node2");
    assert(node1.children![1].flexDirection === FlexDirection.Column, "node2 should have flexDirection Row");
});

test("addChildAt - same flexDirection, first node has children, second doesn't", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node1" }),
    ]);
    const node2 = newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node2" });
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(
        node1.children![0].flexDirection === FlexDirection.Column,
        "node1's first child should have flexDirection Column"
    );
    assert(node1.children![1].id === node2.id, "node1's second child should be node2");
    assert(node1.children![1].flexDirection === FlexDirection.Column, "node2 should have flexDirection Column");
});

test("addChildAt - different flexDirection, first node has children, second doesn't", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node1" }),
    ]);
    const node2 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node2" });
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(node1.children![1].id === node2.id, "node1's second child should be node2");
    assert(node1.children![1].flexDirection === FlexDirection.Column, "node2 should now have flexDirection Column");
});

test("addChildAt - same flexDirection, first node has children, second has children", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node1" }),
    ]);
    const node2 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node2" }),
    ]);
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(
        node1.children![0].flexDirection === FlexDirection.Column,
        "node1's first child should have flexDirection Column"
    );
    assert(node1.children![1].id === node2.children![0].id, "node1's second child should be node2's child");
    assert(
        node1.children![1].flexDirection === FlexDirection.Column,
        "node1's second child should have flexDirection Column"
    );
});

test("addChildAt - different flexDirection, first node has children, second has children", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node1" }),
    ]);
    const node2 = newLayoutNode(FlexDirection.Column, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node2" }),
    ]);
    addChildAt(node1, 1, node2);
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children!.length === 2, "node1 should have two children");
    assert(node1.children![0].data!.blockId === "node1", "node1's first child should have node1's data");
    assert(
        node1.children![0].flexDirection === FlexDirection.Column,
        "node1's first child should have flexDirection Column"
    );
    assert(node1.children![1].id === node2.id, "node1's second child should be node2");
    assert(
        node1.children![1].flexDirection === FlexDirection.Column,
        "node1's second child should have flexDirection Column"
    );
});

test("balanceNode - corrects flex directions", () => {
    let node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1Inner1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1Inner2" }),
    ]);
    const newNode1 = balanceNode(node1);
    assert(newNode1 != null, "newNode1 should not be undefined");
    node1 = newNode1;
    assert(node1.data == null, "node1 should have no data");
    assert(node1.children![0].flexDirection !== node1.flexDirection);
});

test("balanceNode - collapses nodes with single grandchild 1", () => {
    let node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, [
            newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        ]),
    ]);
    const newNode1 = balanceNode(node1);
    assert(newNode1 != null, "newNode1 should not be undefined");
    node1 = newNode1;
    assert(node1.children == null, "node1 should have no children");
    assert(node1.data!.blockId === "node1", "node1 should have data 'node1'");
});

test("balanceNode - collapses nodes with single grandchild 2", () => {
    let node2 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, [
            newLayoutNode(FlexDirection.Row, undefined, [
                newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node2Inner1" }),
                newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node2Inner2" }),
            ]),
        ]),
    ]);
    const newNode2 = balanceNode(node2);
    assert(newNode2 != null, "newNode2 should not be undefined");
    node2 = newNode2;
    assert(node2.children!.length === 2, "node2 should have two children");
    assert(node2.children[0].data!.blockId === "node2Inner1", "node2's first child should have data 'node2Inner1'");
    // assert(leafs.length === 2, "leafs should have two leafs");
    // assert(leafs[0].data!.blockId === "node2Inner1", "leafs[0] should have data 'node2Inner1'");
    // assert(leafs[1].data!.blockId === "node2Inner2", "leafs[1] should have data 'node2Inner2'");
});

test("balanceNode - collapses nodes with single grandchild 3", () => {
    let node3 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, [
            newLayoutNode(FlexDirection.Row, undefined, [
                newLayoutNode(FlexDirection.Column, undefined, undefined, { blockId: "node3" }),
            ]),
        ]),
    ]);
    const newNode3 = balanceNode(node3);
    assert(newNode3 != null, "newNode3 should not be undefined");
    node3 = newNode3;
    assert(node3.children == null, "node3 should have no children");
    assert(node3.data!.blockId === "node3", "node3 should have data 'node3'");
});

test("balanceNode - collapses nodes with single grandchild 4", () => {
    let node4 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Column, undefined, [
            newLayoutNode(FlexDirection.Row, undefined, [
                newLayoutNode(FlexDirection.Column, undefined, [
                    newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node4Inner1" }),
                    newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node4Inner2" }),
                ]),
            ]),
        ]),
    ]);
    const newNode4 = balanceNode(node4);
    assert(newNode4 != null, "newNode4 should not be undefined");
    node4 = newNode4;
    assert(node4.children!.length === 1, "node4 should have one child");
    assert(node4.children![0].children!.length === 2, "node4 should have two grandchildren");
    assert(
        node4.children[0].children![0].data!.blockId === "node4Inner1",
        "node4's first child should have data 'node4Inner1'"
    );
});

test("findNextInsertLocation", () => {
    const node1 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
    ]);

    const insertLoc1 = findNextInsertLocation(node1, 5);
    assert(insertLoc1.node.id === node1.id, "should insert into node1");
    assert(insertLoc1.index === 4, "should insert into index 4 of node1");

    const node2Inner5 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node2Inner5" });
    const node2 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        node2Inner5,
    ]);

    const insertLoc2 = findNextInsertLocation(node2, 5);
    assert(insertLoc2.node.id === node2Inner5.id, "should insert into node2Inner5");
    assert(insertLoc2.index === 1, "should insert into index 1 of node2Inner1");

    const node3Inner5 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
    ]);
    const node3Inner4 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node3Inner4" });
    const node3 = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "node1" }),
        node3Inner4,
        node3Inner5,
    ]);

    const insertLoc3 = findNextInsertLocation(node3, 5);
    assert(insertLoc3.node.id === node3Inner4.id, "should insert into node3Inner4");
    assert(insertLoc3.index === 1, "should insert into index 1 of node3Inner4");
});

test("findNode and findParent", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leaf]);
    assert(findNode(root, leaf.id)?.id === leaf.id, "findNode should locate nested leaf");
    assert(findNode(root, "missing") == null, "findNode should return undefined for missing id");
    assert(findParent(root, leaf.id)?.id === root.id, "findParent should return direct parent");
    assert(findParent(root, root.id) == null, "findParent on root id should return undefined");
});

test("removeChild removes matching child", () => {
    const child = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "child" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child]);
    removeChild(root, child);
    assert.equal(root.children?.length, 0);
    removeChild(root, child);
    assert.equal(root.children?.length, 0);
});

test("validateNode accepts valid leaf and branch nodes", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    assert(validateNode(leaf) === true, "leaf node with data only is valid");
    const branch = newLayoutNode(FlexDirection.Row, undefined, [leaf]);
    assert(validateNode(branch) === true, "branch node with children is valid");
});

test("validateNode rejects invalid nodes", () => {
    const both: LayoutNode = {
        id: "bad",
        flexDirection: FlexDirection.Row,
        size: 50,
        data: { blockId: "x" },
        children: [newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "y" })],
    };
    assert(validateNode(both) === false, "node with both data and children is invalid");
    const emptyChildren: LayoutNode = {
        id: "empty",
        flexDirection: FlexDirection.Row,
        size: 50,
        children: [],
    };
    assert(validateNode(emptyChildren) === false, "node with empty children is invalid");
});

test("walkNodes visits all nodes in order", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leaf]);
    const visited: string[] = [];
    walkNodes(
        root,
        (node) => visited.push(`pre:${node.id}`),
        (node) => visited.push(`post:${node.id}`)
    );
    assert(visited.includes(`pre:${root.id}`));
    assert(visited.includes(`pre:${leaf.id}`));
    assert(visited.includes(`post:${leaf.id}`));
    assert(visited.indexOf(`post:${leaf.id}`) > visited.indexOf(`pre:${leaf.id}`));
});

test("findInsertLocationFromIndexArr traverses nested indices", () => {
    const inner = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "inner" });
    const mid = newLayoutNode(FlexDirection.Row, undefined, [inner]);
    const root = newLayoutNode(FlexDirection.Row, undefined, [mid]);
    const loc = findInsertLocationFromIndexArr(root, [0, 0]);
    assert.equal(loc.node.id, mid.id);
    assert.equal(loc.index, 0);
});

test("findInsertLocationFromIndexArr returns undefined for empty indexArr", () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "solo" });
    assert(findInsertLocationFromIndexArr(root, []) == null);
});

test("addChildAt flattens same-flexDirection children", () => {
    const leaf1 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "l1" });
    const leaf2 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "l2" });
    const wrapper = newLayoutNode(FlexDirection.Row, undefined, [leaf1, leaf2]);
    const parent = newLayoutNode(FlexDirection.Row, undefined, [newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "existing" })]);
    addChildAt(parent, 1, wrapper);
    assert.equal(parent.children!.length, 3);
    assert(parent.children!.some((c) => c.data?.blockId === "l1"));
    assert(parent.children!.some((c) => c.data?.blockId === "l2"));
});

test("addChildAt no-ops for empty children list", () => {
    const parent = newLayoutNode(FlexDirection.Row, undefined, [newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "x" })]);
    const beforeLen = parent.children!.length;
    addChildAt(parent, 0);
    assert.equal(parent.children!.length, beforeLen);
});

test("balanceNode collapses single-child wrapper", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const wrapper = newLayoutNode(FlexDirection.Column, undefined, [leaf]);
    const root = newLayoutNode(FlexDirection.Row, undefined, [wrapper]);
    const balanced = balanceNode(root);
    assert.equal(balanced.data?.blockId, "leaf");
    assert(balanced.children == null);
});

test("findNode returns undefined for null node", () => {
    assert(findNode(null as any, "any") == null);
});

test("findInsertLocationFromIndexArr handles negative index", () => {
    const child0 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c0" });
    const child1 = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c1" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [child0, child1]);
    const loc = findInsertLocationFromIndexArr(root, [-1]);
    assert.equal(loc.index, 3);
});

test("removeChild respects startingIndex", () => {
    const dup = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "dup" });
    const other = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "other" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [dup, other, dup]);
    removeChild(root, dup, 1);
    assert.equal(root.children!.length, 2);
    assert.equal(root.children![0].data!.blockId, "dup");
});

test("findNextInsertLocation on leaf node", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const loc = findNextInsertLocation(leaf, 5);
    assert.equal(loc.node.id, leaf.id);
    assert.equal(loc.index, 1);
});

test("balanceNode runs walk callbacks", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leaf]);
    const visited: string[] = [];
    balanceNode(
        root,
        (node) => visited.push(`pre:${node.id}`),
        (node) => visited.push(`post:${node.id}`)
    );
    assert(visited.includes(`pre:${leaf.id}`));
    assert(visited.includes(`post:${leaf.id}`));
});

test("findInsertLocationFromIndexArr descends with remaining indices", () => {
    const inner = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "inner" });
    const mid = newLayoutNode(FlexDirection.Row, undefined, [inner]);
    const root = newLayoutNode(FlexDirection.Row, undefined, [mid]);
    const loc = findInsertLocationFromIndexArr(root, [0, 0, 0]);
    assert.equal(loc.node.id, inner.id);
    assert.equal(loc.index, 0);
});

test("findNextInsertLocationHelper prefers deeper insert when full", () => {
    const children = Array.from({ length: 5 }, (_, i) =>
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: `c${i}` })
    );
    const root = newLayoutNode(FlexDirection.Row, undefined, children);
    const loc = findNextInsertLocation(root, 5);
    assert.equal(loc.node.id, children[4].id);
    assert.equal(loc.index, 1);
});

test("addChildAt no-op with zero children", () => {
    const root = newLayoutNode(FlexDirection.Row, undefined, [
        newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c" }),
    ]);
    const before = root.children!.length;
    addChildAt(root, 0);
    assert.equal(root.children!.length, before);
});

test("addChildAt inserts at index in existing children", () => {
    const a = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const b = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const c = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [a, b]);
    addChildAt(root, 1, c);
    assert.equal(root.children!.length, 3);
    assert.equal(root.children![1].data!.blockId, "c");
});

test("addChildAt ignores negative index", () => {
    const a = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const b = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [a]);
    addChildAt(root, -1, b);
    assert.equal(root.children!.length, 1);
});

test("findParent returns undefined when id matches root", () => {
    const leaf = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "leaf" });
    const root = newLayoutNode(FlexDirection.Row, undefined, [leaf]);
    assert(findParent(root, root.id) == null);
});
