// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

describe("SSHPanelModel", () => {
    it("derives groups from hosts atom", async () => {
        vi.resetModules();
        vi.doMock("@/app/store/services", () => ({
            ClientService: {
                GetSshHosts: vi.fn(),
            },
        }));

        const { SSHPanelModel } = await import("./sshpanel-model");
        const model = SSHPanelModel.getInstance();
        const { globalStore } = await import("@/app/store/jotaiStore");

        globalStore.set(model.hostsAtom, [
            { pattern: "acme-web", hostname: "", user: "", port: "" },
            { pattern: "solo", hostname: "", user: "", port: "" },
        ]);

        const groups = globalStore.get(model.groupsAtom);
        expect(groups.map((g) => g.name)).toEqual(["acme", "other"]);
    });

    it("loads hosts from ClientService", async () => {
        vi.resetModules();
        const getSshHosts = vi.fn(async () => [
            { pattern: "prod", hostname: "prod.internal", user: "ops", port: "2222" },
        ]);
        vi.doMock("@/app/store/services", () => ({
            ClientService: {
                GetSshHosts: getSshHosts,
            },
        }));

        const { SSHPanelModel } = await import("./sshpanel-model");
        const model = SSHPanelModel.getInstance();
        const { globalStore } = await import("@/app/store/jotaiStore");

        await model.loadHosts();

        expect(getSshHosts).toHaveBeenCalledTimes(1);
        expect(globalStore.get(model.loadingAtom)).toBe(false);
        expect(globalStore.get(model.hostsAtom)).toEqual([
            { pattern: "prod", hostname: "prod.internal", user: "ops", port: "2222" },
        ]);
        expect(globalStore.get(model.errorAtom)).toBeNull();
    });

    it("stores load errors and clears loading state", async () => {
        vi.resetModules();
        vi.doMock("@/app/store/services", () => ({
            ClientService: {
                GetSshHosts: vi.fn(async () => {
                    throw new Error("rpc failed");
                }),
            },
        }));

        const { SSHPanelModel } = await import("./sshpanel-model");
        const model = SSHPanelModel.getInstance();
        const { globalStore } = await import("@/app/store/jotaiStore");

        await model.loadHosts();

        expect(globalStore.get(model.loadingAtom)).toBe(false);
        expect(globalStore.get(model.errorAtom)).toBe("rpc failed");
    });

    it("toggles collapsed group membership", async () => {
        vi.resetModules();
        vi.doMock("@/app/store/services", () => ({
            ClientService: {
                GetSshHosts: vi.fn(),
            },
        }));

        const { SSHPanelModel } = await import("./sshpanel-model");
        const model = SSHPanelModel.getInstance();

        expect(model.isGroupCollapsed("acme")).toBe(false);
        model.toggleGroupCollapsed("acme");
        expect(model.isGroupCollapsed("acme")).toBe(true);
        model.toggleGroupCollapsed("acme");
        expect(model.isGroupCollapsed("acme")).toBe(false);
    });
});
