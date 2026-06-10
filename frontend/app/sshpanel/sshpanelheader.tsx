// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo } from "react";
import { SSHPanelModel } from "./sshpanel-model";

export const SSHPanelHeader = memo(() => {
    const model = SSHPanelModel.getInstance();
    const searchQuery = useAtomValue(model.searchQueryAtom);
    const hostCount = useAtomValue(model.hostCountAtom);
    const loading = useAtomValue(model.loadingAtom);

    const handleRefresh = () => {
        model.loadHosts();
    };

    return (
        <div className="border-b border-border/80 flex flex-col gap-2.5 px-3 py-3 shrink-0 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex flex-col min-w-0">
                    <span className="text-primary text-sm font-semibold tracking-tight">Hosts</span>
                    <span className="text-muted text-[11px]">
                        {loading ? "Loading..." : `${hostCount} host${hostCount === 1 ? "" : "s"}`}
                    </span>
                </div>
                <button
                    onClick={handleRefresh}
                    className="text-secondary hover:text-primary cursor-pointer transition-colors p-1.5 rounded-md hover:bg-white/5 flex-shrink-0 focus:outline-none"
                    title="Refresh hosts"
                >
                    <i className={cn("fa fa-rotate-right", loading && "fa-spin")} />
                </button>
            </div>
            <div className="relative">
                <i className="fa fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => model.setSearchQuery(e.target.value)}
                    placeholder="Search hosts..."
                    className="w-full bg-black/20 border border-border/60 rounded-md pl-8 pr-3 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-[#2eff6a]/50 transition-colors"
                />
            </div>
        </div>
    );
});

SSHPanelHeader.displayName = "SSHPanelHeader";
