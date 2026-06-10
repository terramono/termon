// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { ErrorBoundary } from "@/app/element/errorboundary";
import {
    createBlock,
    createBlockSplitHorizontally,
    getConnStatusAtom,
    getFocusedBlockId,
} from "@/store/global";
import { cn } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect } from "react";
import type { SshHostGroup } from "./sshpanel-model";
import {
    connectionMetaFromSshHost,
    hostCardSubtitleFromSshHost,
    hostTagsFromSshHost,
    SSHPanelModel,
} from "./sshpanel-model";
import { SSHPanelHeader } from "./sshpanelheader";

async function connectToHost(host: SshConfigHost): Promise<void> {
    const connMeta = connectionMetaFromSshHost(host);
    const blockDef: BlockDef = {
        meta: {
            view: "term",
            connection: connMeta,
        },
    };
    const focusedBlockId = getFocusedBlockId();
    if (focusedBlockId) {
        await createBlockSplitHorizontally(blockDef, focusedBlockId, "after");
    } else {
        await createBlock(blockDef);
    }
}

type HostCardProps = {
    host: SshConfigHost;
    groupName: string;
};

const HostCard = memo(({ host, groupName }: HostCardProps) => {
    const connMeta = connectionMetaFromSshHost(host);
    const subtitle = hostCardSubtitleFromSshHost(host);
    const tags = hostTagsFromSshHost(host, groupName);
    const connStatus = useAtomValue(getConnStatusAtom(connMeta));

    const handleConnect = useCallback(() => {
        connectToHost(host);
    }, [host]);

    return (
        <div
            className="group mx-2 mb-1 rounded-lg border border-transparent hover:border-border/60 hover:bg-white/[0.03] transition-colors"
            onDoubleClick={handleConnect}
        >
            <div className="flex items-start gap-2.5 px-3 py-2.5">
                <span
                    className={cn(
                        "w-2 h-2 rounded-full shrink-0 mt-1.5",
                        connStatus?.connected ? "bg-[#2eff6a]" : "bg-muted/80"
                    )}
                    title={connStatus?.connected ? "Connected" : connStatus?.status ?? "Disconnected"}
                />
                <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <span className="text-primary text-sm font-medium truncate">{host.pattern}</span>
                    <span className="text-secondary text-xs truncate">{subtitle}</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted border border-border/40"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleConnect}
                    className="opacity-0 group-hover:opacity-100 shrink-0 self-center px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#2eff6a]/15 text-[#2eff6a] border border-[#2eff6a]/30 hover:bg-[#2eff6a]/25 transition-all cursor-pointer"
                    title={`Connect to ${host.pattern}`}
                >
                    Connect
                </button>
            </div>
        </div>
    );
});
HostCard.displayName = "HostCard";

type GroupSectionProps = {
    group: SshHostGroup;
};

const GroupSection = memo(({ group }: GroupSectionProps) => {
    const model = SSHPanelModel.getInstance();
    const collapsedGroups = useAtomValue(model.collapsedGroupsAtom);
    const isCollapsed = collapsedGroups.has(group.name);
    const displayName = group.name === "other" ? "Other" : group.name;

    return (
        <div className="mb-2">
            <button
                onClick={() => model.toggleGroupCollapsed(group.name)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer hover:bg-white/[0.03] rounded-md transition-colors"
            >
                <i
                    className={cn(
                        "fa fa-chevron-right text-[9px] text-muted transition-transform",
                        !isCollapsed && "rotate-90"
                    )}
                />
                <span className="text-xs text-primary font-semibold capitalize">{displayName}</span>
                <span className="ml-auto text-[11px] text-muted tabular-nums">
                    {group.hosts.length} host{group.hosts.length === 1 ? "" : "s"}
                </span>
            </button>
            {!isCollapsed && (
                <div className="mt-0.5">
                    {group.hosts.map((host) => (
                        <HostCard
                            key={`${host.pattern}|${host.user}|${host.port}|${host.hostname}`}
                            host={host}
                            groupName={group.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
GroupSection.displayName = "GroupSection";

type SSHPanelInnerProps = {
    roundTopLeft: boolean;
};

const SSHPanelInner = memo(({ roundTopLeft }: SSHPanelInnerProps) => {
    const model = SSHPanelModel.getInstance();
    const groups = useAtomValue(model.filteredGroupsAtom);
    const loading = useAtomValue(model.loadingAtom);
    const error = useAtomValue(model.errorAtom);
    const searchQuery = useAtomValue(model.searchQueryAtom);
    const allGroups = useAtomValue(model.groupsAtom);

    useEffect(() => {
        model.loadHosts();
    }, [model]);

    const hasHosts = allGroups.length > 0;
    const noSearchResults = hasHosts && groups.length === 0 && searchQuery.trim() !== "";

    return (
        <div
            className="@container bg-panel flex flex-col mt-1 h-[calc(100%-4px)]"
            style={{
                borderTopLeftRadius: roundTopLeft ? 10 : 0,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
                borderBottomLeftRadius: 10,
            }}
        >
            <SSHPanelHeader />

            <div className="flex-1 overflow-y-auto py-2 min-h-0">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted text-sm gap-2">
                        <i className="fa fa-spinner fa-spin text-lg" />
                        <span>Loading hosts...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="mx-3 px-3 py-3 rounded-lg border border-error/30 bg-error/10 text-error text-sm">
                        <i className="fa fa-triangle-exclamation mr-2" />
                        {error}
                    </div>
                )}

                {!loading && !error && !hasHosts && (
                    <div className="px-4 py-10 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-3">
                            <i className="fa fa-server text-muted" />
                        </div>
                        <p className="text-primary text-sm font-medium">No hosts configured</p>
                        <p className="text-muted text-xs mt-1 leading-relaxed">
                            Add entries to <span className="text-secondary">~/.ssh/config</span> to see them here
                        </p>
                    </div>
                )}

                {!loading && !error && noSearchResults && (
                    <div className="px-4 py-10 text-center text-muted text-sm">
                        No hosts match &ldquo;{searchQuery.trim()}&rdquo;
                    </div>
                )}

                {!loading && !error && groups.map((group) => (
                    <GroupSection key={group.name} group={group} />
                ))}
            </div>
        </div>
    );
});
SSHPanelInner.displayName = "SSHPanelInner";

type SSHPanelProps = {
    roundTopLeft: boolean;
};

const SSHPanelComponent = ({ roundTopLeft }: SSHPanelProps) => {
    return (
        <ErrorBoundary>
            <SSHPanelInner roundTopLeft={roundTopLeft} />
        </ErrorBoundary>
    );
};

SSHPanelComponent.displayName = "SSHPanel";

export { SSHPanelComponent as SSHPanel, connectToHost };
