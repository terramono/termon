// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRef } from "react";
import { assert, test } from "vitest";
import { NodeRefMap } from "../lib/nodeRefMap";

test("NodeRefMap set get delete and generation", () => {
    const map = new NodeRefMap();
    const refA = createRef<HTMLDivElement>();
    const refB = createRef<HTMLDivElement>();

    assert.equal(map.generation, 0);
    map.set("a", refA);
    assert.equal(map.generation, 1);
    assert.equal(map.get("a"), refA);

    map.set("b", refB);
    assert.equal(map.generation, 2);
    assert.equal(map.get("b"), refB);
    assert(map.get("missing") == null);

    map.delete("a");
    assert.equal(map.generation, 3);
    assert(map.get("a") == null);

    map.delete("missing");
    assert.equal(map.generation, 3);
});
