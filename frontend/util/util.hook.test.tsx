// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @vitest-environment happy-dom
 */

import { atom } from "jotai";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { useAtomValueSafe } from "./util";

describe("useAtomValueSafe", () => {
    it("reads provided atom values and null atom fallback", () => {
        const valueAtom = atom("hello");
        let value: string;
        function Probe() {
            value = useAtomValueSafe(valueAtom);
            return null;
        }
        const container = document.createElement("div");
        const root = createRoot(container);
        act(() => root.render(<Probe />));
        expect(value).toBe("hello");

        function NullProbe() {
            value = useAtomValueSafe(null);
            return null;
        }
        act(() => root.render(<NullProbe />));
        expect(value).toBeNull();
        act(() => root.unmount());
    });
});
