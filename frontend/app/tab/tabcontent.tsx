// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Block } from "@/app/block/block";
import { CenteredDiv } from "@/element/quickelems";
import { ContentRenderer, NodeModel, PreviewRenderer, TileLayout } from "@/layout/index";
import { TileLayoutContents } from "@/layout/lib/types";
import { atoms, createBlock, getApi } from "@/store/global";
import * as services from "@/store/services";
import * as WOS from "@/store/wos";
import { cn, fireAndForget } from "@/util/util";
import { atom, useAtomValue } from "jotai";
import * as React from "react";
import { useMemo } from "react";

const EMPTY_TAB_BLOCK_DEFS: { label: string; blockDef: BlockDef }[] = [
    {
        label: "Terminal",
        blockDef: { meta: { view: "term", controller: "shell" } },
    },
    {
        label: "Preview",
        blockDef: { meta: { view: "preview", file: "~" } },
    },
    {
        label: "Web",
        blockDef: { meta: { view: "web" } },
    },
];

const accentButtonClass =
    "px-4 py-2 text-sm font-medium bg-accent/80 text-primary rounded hover:bg-accent transition-colors cursor-pointer";

function EmptyTabCreationStrip() {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="text-secondary text-sm">New block</div>
            <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                {EMPTY_TAB_BLOCK_DEFS.map(({ label, blockDef }) => (
                    <button
                        key={label}
                        type="button"
                        className={cn(accentButtonClass)}
                        onClick={() => fireAndForget(() => createBlock(blockDef))}
                    >
                        + {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

const tileGapSizeAtom = atom((get) => {
    const settings = get(atoms.settingsAtom);
    return settings["window:tilegapsize"];
});

const TabContent = React.memo(({ tabId, noTopPadding }: { tabId: string; noTopPadding?: boolean }) => {
    const oref = useMemo(() => WOS.makeORef("tab", tabId), [tabId]);
    const loadingAtom = useMemo(() => WOS.getWaveObjectLoadingAtom(oref), [oref]);
    const tabLoading = useAtomValue(loadingAtom);
    const tabAtom = useMemo(() => WOS.getWaveObjectAtom<Tab>(oref), [oref]);
    const tabData = useAtomValue(tabAtom);
    const tileGapSize = useAtomValue(tileGapSizeAtom);

    const tileLayoutContents = useMemo(() => {
        const renderContent: ContentRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={false} />;
        };

        const renderPreview: PreviewRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={true} />;
        };

        function onNodeDelete(data: TabLayoutData) {
            return services.ObjectService.DeleteBlock(data.blockId);
        }

        return {
            renderContent,
            renderPreview,
            tabId,
            onNodeDelete,
            gapSizePx: tileGapSize,
        } as TileLayoutContents;
    }, [tabId, tileGapSize]);

    let innerContent;

    if (tabLoading) {
        innerContent = <CenteredDiv>Tab Loading</CenteredDiv>;
    } else if (!tabData) {
        innerContent = <CenteredDiv>Tab Not Found</CenteredDiv>;
    } else if (tabData?.blockids?.length == 0) {
        innerContent = <EmptyTabCreationStrip />;
    } else {
        innerContent = (
            <TileLayout
                key={tabId}
                contents={tileLayoutContents}
                tabAtom={tabAtom}
                getCursorPoint={getApi().getCursorPoint}
            />
        );
    }

    return (
        <div className={`flex flex-row flex-grow min-h-0 w-full items-center justify-center overflow-hidden relative ${noTopPadding ? "" : "pt-[3px]"} pr-[3px]`}>
            {innerContent}
        </div>
    );
});

TabContent.displayName = "TabContent";

export { TabContent };
