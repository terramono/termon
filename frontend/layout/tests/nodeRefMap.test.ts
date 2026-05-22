// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRef } from "react";
import { assert, test } from "vitest";
import { NodeRefMap } from "../lib/nodeRefMap";

test("NodeRefMap set get delete and generation", () => {
    const map = new NodeRefMap();
    assert.equal(map.generation, 0);

    const refA = createRef<HTMLDivElement>();
    map.set("a", refA);
    assert.equal(map.generation, 1);
    assert.equal(map.get("a"), refA);

    const refB = createRef<HTMLDivElement>();
    map.set("b", refB);
    assert.equal(map.generation, 2);

    map.delete("a");
    assert.equal(map.generation, 3);
    assert(map.get("a") == null);

    const genBefore = map.generation;
    map.delete("missing");
    assert.equal(map.generation, genBefore);
});
