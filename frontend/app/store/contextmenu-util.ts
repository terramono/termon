// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

export function convertContextMenuForElectron(
    menu: ContextMenuItem[],
    handlers: Map<string, ContextMenuItem>
): ElectronContextMenuItem[] {
    const electronMenuItems: ElectronContextMenuItem[] = [];
    for (const item of menu) {
        const electronItem: ElectronContextMenuItem = {
            role: item.role,
            type: item.type,
            label: item.label,
            sublabel: item.sublabel,
            id: crypto.randomUUID(),
            checked: item.checked,
        };
        if (item.visible === false) {
            electronItem.visible = false;
        }
        if (item.enabled === false) {
            electronItem.enabled = false;
        }
        if (item.click) {
            handlers.set(electronItem.id, item);
        }
        if (item.submenu) {
            electronItem.submenu = convertContextMenuForElectron(item.submenu, handlers);
        }
        electronMenuItems.push(electronItem);
    }
    return electronMenuItems;
}
