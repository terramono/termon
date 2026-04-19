// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { globalStore } from "@/app/store/jotaiStore";
import { ClientService } from "@/app/store/services";
import { atom, type Atom, type PrimitiveAtom } from "jotai";

export type SshHostGroup = {
    name: string;
    hosts: SshConfigHost[];
};

function groupHosts(hosts: SshConfigHost[]): SshHostGroup[] {
    const groupMap = new Map<string, SshConfigHost[]>();

    for (const host of hosts) {
        const parts = host.pattern.split(/[-_.]/);
        // Use the first segment as the group name if there are multiple segments,
        // otherwise put it in "other".
        const groupName = parts.length > 1 ? parts[0] : "other";
        let arr = groupMap.get(groupName);
        if (arr == null) {
            arr = [];
            groupMap.set(groupName, arr);
        }
        arr.push(host);
    }

    const groups: SshHostGroup[] = [];
    for (const [name, hosts] of groupMap) {
        groups.push({ name, hosts });
    }

    // Sort groups: "other" goes last, rest alphabetically
    groups.sort((a, b) => {
        if (a.name === "other") return 1;
        if (b.name === "other") return -1;
        return a.name.localeCompare(b.name);
    });

    return groups;
}

export class SSHPanelModel {
    private static instance: SSHPanelModel;

    hostsAtom: PrimitiveAtom<SshConfigHost[]> = atom<SshConfigHost[]>([]);
    loadingAtom: PrimitiveAtom<boolean> = atom(false);
    errorAtom = atom(null) as PrimitiveAtom<string>;
    collapsedGroupsAtom: PrimitiveAtom<Set<string>> = atom(new Set<string>());

    groupsAtom: Atom<SshHostGroup[]>;

    private constructor() {
        this.groupsAtom = atom((get) => groupHosts(get(this.hostsAtom)));
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
            globalStore.set(this.hostsAtom, hosts ?? []);
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
