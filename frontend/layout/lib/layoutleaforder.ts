// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { LayoutNode, LayoutNodeAdditionalProps, LeafOrderEntry } from "./types";

export function getLeafOrder(
    leafs: LayoutNode[],
    additionalProps: Record<string, LayoutNodeAdditionalProps>
): LeafOrderEntry[] {
    return leafs
        .map((node) => ({ nodeid: node.id, blockid: node.data.blockId }) as LeafOrderEntry)
        .sort((a, b) => {
            const treeKeyA = additionalProps[a.nodeid]?.treeKey;
            const treeKeyB = additionalProps[b.nodeid]?.treeKey;
            if (!treeKeyA || !treeKeyB) return;
            return treeKeyA.localeCompare(treeKeyB);
        });
}
