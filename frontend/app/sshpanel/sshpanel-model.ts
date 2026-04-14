// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { ClientService } from "@/app/store/services";
import { atom, type PrimitiveAtom } from "jotai";
import { globalStore } from "@/app/store/jotaiStore";

export type SshHostGroup = {
    name: string;
    hosts: SshConfigHost[];
};

function groupHosts(hosts: SshConfigHost[]): SshHostGroup[] {
    const groupMap = new Map<string, SshConfigHost[]>();

    for (const host of hosts) {
        const parts = host.pattern.split(/[-_.]/);
        // Use the first segment as the group name if there are multiple segments,
        // otherwise put it in "Other".
        const groupName = parts.length > 1 ? parts[0] : "other";
        let arr = groupMap.get(groupName);
        if (arr == null) {
            arr = [];
            groupMap.set(groupName, arr);
        }
        arr.push(host);
    }

    const groups: SshHostGroup[] = [];
    for (const [name, groupHosts] of groupMap) {
        groups.push({ name, hosts: groupHosts });
    }

    // Sort groups: "other" goes last, rest alphabetically
    groups.sort((a, b) => {
        if (a.name === "other") return 1;
        if (b.name === "other") return -1;
        return a.name.localeCompare(b.name);
    });

    return groups;
}

class SSHPanelModel {
    private static instance: SSHPanelModel;

    hostsAtom: PrimitiveAtom<SshConfigHost[]>;
    groupsAtom: PrimitiveAtom<SshHostGroup[]>;
    loadingAtom: PrimitiveAtom<boolean>;
    errorAtom: PrimitiveAtom<string | null>;
    collapsedGroupsAtom: PrimitiveAtom<Set<string>>;

    private constructor() {
        this.hostsAtom = atom<SshConfigHost[]>([]);
        this.groupsAtom = atom<SshHostGroup[]>([]);
        this.loadingAtom = atom(false);
        this.errorAtom = atom<string | null>(null);
        this.collapsedGroupsAtom = atom<Set<string>>(new Set());
    }

    static getInstance(): SSHPanelModel {
        if (!SSHPanelModel.instance) {
            SSHPanelModel.instance = new SSHPanelModel();
        }
        return SSHPanelModel.instance;
    }

    async loadHosts(): Promise<void> {
        globalStore.set(this.loadingAtom, true);
        globalStore.set(this.errorAtom, null);
        try {
            const hosts = await ClientService.GetSshHosts();
            const safeHosts = hosts ?? [];
            globalStore.set(this.hostsAtom, safeHosts);
            globalStore.set(this.groupsAtom, groupHosts(safeHosts));
        } catch (e) {
            globalStore.set(this.errorAtom, String(e));
        } finally {
            globalStore.set(this.loadingAtom, false);
        }
    }

    toggleGroupCollapsed(groupName: string): void {
        const current = globalStore.get(this.collapsedGroupsAtom);
        const next = new Set(current);
        if (next.has(groupName)) {
            next.delete(groupName);
        } else {
            next.add(groupName);
        }
        globalStore.set(this.collapsedGroupsAtom, next);
    }

    isGroupCollapsed(groupName: string): boolean {
        return globalStore.get(this.collapsedGroupsAtom).has(groupName);
    }
}

export { SSHPanelModel };
