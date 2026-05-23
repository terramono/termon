// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { convertContextMenuForElectron } from "./contextmenu-util";

describe("convertContextMenuForElectron", () => {
    it("registers click handlers and copies menu fields", () => {
        const handlers = new Map<string, ContextMenuItem>();
        const click = () => {};
        const items = convertContextMenuForElectron(
            [
                {
                    label: "Open",
                    sublabel: "hint",
                    checked: true,
                    enabled: false,
                    visible: false,
                    click,
                },
            ],
            handlers
        );

        expect(items).toHaveLength(1);
        expect(items[0].label).toBe("Open");
        expect(items[0].sublabel).toBe("hint");
        expect(items[0].checked).toBe(true);
        expect(items[0].enabled).toBe(false);
        expect(items[0].visible).toBe(false);
        expect(handlers.size).toBe(1);
        expect(handlers.get(items[0].id)?.click).toBe(click);
    });

    it("recursively converts nested submenus", () => {
        const handlers = new Map<string, ContextMenuItem>();
        const nestedClick = () => {};
        const items = convertContextMenuForElectron(
            [
                {
                    label: "Parent",
                    submenu: [{ label: "Child", click: nestedClick }],
                },
            ],
            handlers
        );

        expect(items[0].submenu).toHaveLength(1);
        expect(items[0].submenu?.[0].label).toBe("Child");
        expect(handlers.size).toBe(1);
        expect(Array.from(handlers.values())[0].label).toBe("Child");
    });

    it("skips handler registration for items without click", () => {
        const handlers = new Map<string, ContextMenuItem>();
        convertContextMenuForElectron([{ label: "Separator", type: "separator" }], handlers);
        expect(handlers.size).toBe(0);
    });
});
