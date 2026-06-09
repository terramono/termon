// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { memo } from "react";
import PixelatedTechnologyIcon from "../asset/pixelated-technology.svg";
import { SSHPanelModel } from "./sshpanel-model";

export const SSHPanelHeader = memo(() => {
    const model = SSHPanelModel.getInstance();

    const handleRefresh = () => {
        model.loadHosts();
    };

    return (
        <div className="py-2 pl-3 pr-1 @xs:p-2 @xs:pl-4 border-b border-border flex items-center justify-between min-w-0 shrink-0">
            <h2 className="text-primary text-sm @xs:text-lg font-semibold flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                <PixelatedTechnologyIcon className="w-4 h-4 @xs:w-[18px] @xs:h-[18px] text-accent" />
            </h2>
            <button
                onClick={handleRefresh}
                className="text-secondary hover:text-primary cursor-pointer transition-colors p-1 rounded flex-shrink-0 ml-2 focus:outline-none"
                title="Refresh hosts"
            >
                <i className="fa fa-rotate-right" />
            </button>
        </div>
    );
});

SSHPanelHeader.displayName = "SSHPanelHeader";
