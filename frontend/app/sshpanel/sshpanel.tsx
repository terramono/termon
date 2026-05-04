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
import { memo, useEffect, useState } from "react";
import type { SshHostGroup } from "./sshpanel-model";
import { SSHPanelModel } from "./sshpanel-model";
import { SSHPanelHeader } from "./sshpanelheader";

function connectionMetaFromSshHost(host: SshConfigHost): string {
    let s = "";
    if (host.user) {
        s = host.user + "@";
    }
    s += host.pattern;
    if (host.port != null && host.port !== "" && host.port !== "22") {
        s += ":" + host.port;
    }
    return s;
}

type HostCardProps = {
    host: SshConfigHost;
};

const HostStatusDot = memo(({ connName }: { connName: string }) => {
    const connStatus = useAtomValue(getConnStatusAtom(connName));
    return (
        <span
            className={cn(
                "w-2 h-2 rounded-full shrink-0 mt-0.5",
                connStatus?.connected ? "bg-green-400" : "bg-gray-500"
            )}
            title={connStatus?.connected ? "Connected" : connStatus?.status ?? "Disconnected"}
        />
    );
});
HostStatusDot.displayName = "HostStatusDot";

const HostCard = memo(({ host }: HostCardProps) => {
    const displayHost = host.hostname || host.pattern;
    const connStr = host.user ? `${host.user}@${displayHost}` : displayHost;

    const connMeta = connectionMetaFromSshHost(host);

    const subtitle = [host.user ? `${host.user}@${displayHost}` : displayHost]
        .concat(host.port ? [`:${host.port}`] : [])
        .join("");

    const handleDoubleClick = async () => {
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
    };

    return (
        <div
            className="flex items-start gap-2.5 px-3 py-2 rounded-md cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors select-none group"
            onDoubleClick={handleDoubleClick}
            title={`Double-click to SSH into ${host.pattern}`}
        >
            <HostStatusDot connName={connMeta} />
            <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">{host.pattern}</span>
                <span className="text-gray-400 text-xs truncate">{subtitle}</span>
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

    return (
        <div className="mb-1">
            <button
                onClick={() => model.toggleGroupCollapsed(group.name)}
                className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer uppercase tracking-wider font-semibold"
            >
                <i className={cn("fa fa-chevron-right text-[10px] transition-transform", !isCollapsed && "rotate-90")} />
                <span>{group.name}</span>
                <span className="ml-auto text-gray-600 font-normal normal-case tracking-normal">
                    {group.hosts.length}
                </span>
            </button>
            {!isCollapsed && (
                <div className="pl-1">
                    {group.hosts.map((host) => (
                        <HostCard
                            key={`${host.pattern}|${host.user}|${host.port}|${host.hostname}`}
                            host={host}
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
    const groups = useAtomValue(model.groupsAtom);
    const loading = useAtomValue(model.loadingAtom);
    const error = useAtomValue(model.errorAtom);
    const [initialLoad, setInitialLoad] = useState(false);

    useEffect(() => {
        if (!initialLoad) {
            setInitialLoad(true);
            model.loadHosts();
        }
    }, [initialLoad]);

    return (
        <div
            className="@container bg-zinc-900/70 flex flex-col mt-1 h-[calc(100%-4px)]"
            style={{
                borderTopLeftRadius: roundTopLeft ? 10 : 0,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
                borderBottomLeftRadius: 10,
            }}
        >
            <SSHPanelHeader />

            <div className="flex-1 overflow-y-auto py-1 min-h-0">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                        <i className="fa fa-spinner fa-spin mr-2" />
                        Loading hosts...
                    </div>
                )}

                {!loading && error && (
                    <div className="px-3 py-4 text-red-400 text-sm">
                        <i className="fa fa-triangle-exclamation mr-2" />
                        {error}
                    </div>
                )}

                {!loading && !error && groups.length === 0 && (
                    <div className="px-3 py-8 text-center text-gray-500 text-sm">
                        <p>No hosts found in ~/.ssh/config</p>
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

export { SSHPanelComponent as SSHPanel };
