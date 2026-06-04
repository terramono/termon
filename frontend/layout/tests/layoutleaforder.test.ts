// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { assert, test } from "vitest";
import { getLeafOrder } from "../lib/layoutleaforder";
import { newLayoutNode } from "../lib/layoutNode";
import { FlexDirection } from "../lib/types";

test("getLeafOrder sorts by treeKey", () => {
    const nodeA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const nodeB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const nodeC = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "c" });

    const order = getLeafOrder([nodeC, nodeA, nodeB], {
        [nodeA.id]: { treeKey: "1" },
        [nodeB.id]: { treeKey: "2" },
        [nodeC.id]: { treeKey: "0" },
    });

    assert.equal(order.length, 3);
    assert.equal(order[0].blockid, "c");
    assert.equal(order[1].blockid, "a");
    assert.equal(order[2].blockid, "b");
});

test("getLeafOrder preserves input order when treeKey missing", () => {
    const nodeA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const nodeB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });

    const order = getLeafOrder([nodeA, nodeB], {});

    assert.equal(order[0].blockid, "a");
    assert.equal(order[1].blockid, "b");
});

test("getLeafOrder sorts partial treeKey coverage", () => {
    const nodeA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const nodeB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const order = getLeafOrder([nodeA, nodeB], {
        [nodeA.id]: { treeKey: "1" },
    });
    assert.equal(order.length, 2);
    assert.equal(order[0].blockid, "a");
    assert.equal(order[1].blockid, "b");
});

test("getLeafOrder stable when only one node has treeKey", () => {
    const nodeA = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "a" });
    const nodeB = newLayoutNode(FlexDirection.Row, undefined, undefined, { blockId: "b" });
    const order = getLeafOrder([nodeB, nodeA], {
        [nodeB.id]: { treeKey: "z" },
    });
    assert.equal(order[0].blockid, "b");
    assert.equal(order[1].blockid, "a");
});
