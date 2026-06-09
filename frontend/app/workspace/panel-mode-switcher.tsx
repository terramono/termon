// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { cn } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo } from "react";

type PanelMode = "ai" | "ssh";

type PanelModeSwitcherProps = {
    className?: string;
};

const PanelModeSwitcher = memo(({ className }: PanelModeSwitcherProps) => {
    const layoutModel = WorkspaceLayoutModel.getInstance();
    const panelMode = useAtomValue(layoutModel.panelModeAtom);

    const onSelect = (mode: PanelMode) => {
        layoutModel.togglePanelMode(mode);
    };

    return (
        <div
            className={cn(
                "flex h-7 items-stretch overflow-hidden rounded-md border border-gray-600/80 text-xs",
                className
            )}
        >
            <button
                type="button"
                onClick={() => onSelect("ai")}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 cursor-pointer transition-colors",
                    panelMode === "ai" ? "bg-accent/80 text-primary" : "text-secondary hover:bg-hoverbg"
                )}
            >
                <i className="fa fa-sparkles" />
                AI
            </button>
            <button
                type="button"
                onClick={() => onSelect("ssh")}
                className={cn(
                    "flex items-center gap-1.5 border-l border-gray-600/80 px-2.5 cursor-pointer transition-colors",
                    panelMode === "ssh" ? "bg-accent/80 text-primary" : "text-secondary hover:bg-hoverbg"
                )}
            >
                SSH
            </button>
        </div>
    );
});
PanelModeSwitcher.displayName = "PanelModeSwitcher";

export { PanelModeSwitcher };
