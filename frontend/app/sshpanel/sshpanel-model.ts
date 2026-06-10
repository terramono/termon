// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { globalStore } from "@/app/store/jotaiStore";
import { ClientService } from "@/app/store/services";
import { atom, type Atom, type PrimitiveAtom } from "jotai";

export type SshHostGroup = {
    name: string;
    hosts: SshConfigHost[];
};

export function connectionMetaFromSshHost(host: SshConfigHost): string {
    let s = host.user ? `${host.user}@${host.pattern}` : host.pattern;
    if (host.port != null && host.port !== "" && host.port !== "22") {
        s += `:${host.port}`;
    }
    return s;
}

export function hostCardSubtitleFromSshHost(host: SshConfigHost): string {
    const displayHost = host.hostname || host.pattern;
    return `${host.user ? `${host.user}@` : ""}${displayHost}${host.port ? `:${host.port}` : ""}`;
}

export function hostTagsFromSshHost(host: SshConfigHost, groupName: string): string[] {
    const tags: string[] = ["ssh"];
    if (groupName !== "other") {
        tags.push(groupName);
    }
    if (host.user) {
        tags.push(host.user);
    }
    return tags;
}

export function filterHosts(hosts: SshConfigHost[], query: string): SshConfigHost[] {
    const q = query.trim().toLowerCase();
    if (!q) {
        return hosts;
    }
    return hosts.filter((host) => {
        const haystack = [
            host.pattern,
            host.hostname,
            host.user,
            host.port,
            connectionMetaFromSshHost(host),
            hostCardSubtitleFromSshHost(host),
        ]
            .join(" ")
            .toLowerCase();
        return haystack.includes(q);
    });
}

export function filterGroups(groups: SshHostGroup[], query: string): SshHostGroup[] {
    const q = query.trim();
    if (!q) {
        return groups;
    }
    return groups
        .map((group) => ({
            name: group.name,
            hosts: filterHosts(group.hosts, q),
        }))
        .filter((group) => group.hosts.length > 0);
}

export function groupHosts(hosts: SshConfigHost[]): SshHostGroup[] {
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

    for (const [, list] of groupMap) {
        list.sort((a, b) => {
            const pa = a.pattern.localeCompare(b.pattern);
            if (pa !== 0) {
                return pa;
            }
            const ua = (a.user || "").localeCompare(b.user || "");
            if (ua !== 0) {
                return ua;
            }
            return (a.port || "").localeCompare(b.port || "");
        });
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
    searchQueryAtom: PrimitiveAtom<string> = atom("");

    groupsAtom: Atom<SshHostGroup[]>;
    filteredGroupsAtom: Atom<SshHostGroup[]>;
    hostCountAtom: Atom<number>;

    private constructor() {
        this.groupsAtom = atom((get) => groupHosts(get(this.hostsAtom)));
        this.filteredGroupsAtom = atom((get) => {
            const groups = get(this.groupsAtom);
            const query = get(this.searchQueryAtom);
            return filterGroups(groups, query);
        });
        this.hostCountAtom = atom((get) => {
            const groups = get(this.filteredGroupsAtom);
            return groups.reduce((sum, group) => sum + group.hosts.length, 0);
        });
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
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            globalStore.set(this.errorAtom, msg);
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

    setSearchQuery(query: string): void {
        globalStore.set(this.searchQueryAtom, query);
    }
}
