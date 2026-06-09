// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { PanelModeSwitcher } from "@/app/workspace/panel-mode-switcher";
import { memo } from "react";
import { SSHPanelModel } from "./sshpanel-model";

export const SSHPanelHeader = memo(() => {
    const model = SSHPanelModel.getInstance();

    const handleRefresh = () => {
        model.loadHosts();
    };

    return (
        <div className="py-2 pl-3 pr-1 @xs:p-2 @xs:pl-4 border-b border-gray-600 flex items-center justify-between min-w-0 shrink-0">
            <PanelModeSwitcher />
            <button
                onClick={handleRefresh}
                className="text-gray-400 hover:text-white cursor-pointer transition-colors p-1 rounded flex-shrink-0 ml-2 focus:outline-none"
                title="Refresh hosts"
            >
                <i className="fa fa-rotate-right" />
            </button>
        </div>
    );
});

SSHPanelHeader.displayName = "SSHPanelHeader";
