// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getModeDisplayName } from "@/app/aipanel/ai-utils";
import { Toggle } from "@/app/element/toggle";
import { FlexiModal } from "@/app/modals/modal";
import { atoms, createBlock, getApi, useSettingsKeyAtom } from "@/app/store/global";
import { modalsModel } from "@/app/store/modalmodel";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { cn, fireAndForget } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo } from "react";

const TAB_BAR_OPTIONS = [
    { value: "top", label: "Top" },
    { value: "left", label: "Left" },
] as const;

const DEFAULT_BLOCK_OPTIONS = [
    { value: "term", label: "Terminal" },
    { value: "launcher", label: "Launcher" },
] as const;

const TILE_GAP_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12];

type PreferencesRowProps = {
    label: string;
    description?: string;
    children: React.ReactNode;
};

const PreferencesRow = memo(({ label, description, children }: PreferencesRowProps) => {
    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-b-0">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="text-sm text-foreground">{label}</div>
                {description && <div className="text-xs text-secondary leading-snug">{description}</div>}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
});

PreferencesRow.displayName = "PreferencesRow";

const selectClassName =
    "bg-main border border-border rounded px-2 py-1.5 text-sm text-foreground cursor-pointer hover:bg-hoverbg transition-colors min-w-[140px]";

function setConfigValue(updates: Partial<SettingsType>) {
    fireAndForget(() => RpcApi.SetConfigCommand(TabRpcClient, updates));
}

const PreferencesModal = () => {
    const fullConfig = useAtomValue(atoms.fullConfigAtom);
    const tabBar = useSettingsKeyAtom("app:tabbar") ?? "top";
    const defaultNewBlock = useSettingsKeyAtom("app:defaultnewblock") ?? "term";
    const tileGapSize = useSettingsKeyAtom("window:tilegapsize") ?? 3;
    const telemetryEnabled = useSettingsKeyAtom("telemetry:enabled") ?? false;
    const defaultAiMode = useSettingsKeyAtom("waveai:defaultmode") ?? "waveai@balanced";

    const homeDir = getApi().getHomeDir();
    const sshConfigPath = homeDir ? `${homeDir}/.ssh/config` : "~/.ssh/config";

    const aiModes = Object.entries(fullConfig?.waveai ?? {})
        .map(([mode, config]) => ({ mode, config }))
        .sort((a, b) => (a.config["display:order"] ?? 0) - (b.config["display:order"] ?? 0));

    const openWaveAiConfig = () => {
        modalsModel.popModal();
        fireAndForget(async () => {
            await createBlock(
                {
                    meta: {
                        view: "waveconfig",
                        file: "waveai.json",
                    },
                },
                false,
                true
            );
        });
    };

    const openAdvancedSettings = () => {
        modalsModel.popModal();
        fireAndForget(async () => {
            await createBlock(
                {
                    meta: {
                        view: "waveconfig",
                    },
                },
                false,
                true
            );
        });
    };

    return (
        <FlexiModal className="w-[520px] max-h-[85vh] overflow-hidden flex flex-col" onClickBackdrop={() => modalsModel.popModal()}>
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div className="text-lg text-foreground">Preferences</div>
                <button
                    type="button"
                    className="text-secondary hover:text-white transition-colors cursor-pointer px-2 py-1"
                    onClick={() => modalsModel.popModal()}
                    title="Close"
                >
                    <i className="fa-sharp fa-solid fa-xmark"></i>
                </button>
            </div>
            <div className="text-xs text-secondary mb-3 flex-shrink-0">Common settings. Use Advanced Settings for full JSON editing.</div>
            <div className="overflow-y-auto min-h-0 flex-1 -mx-1 px-1">
                <PreferencesRow label="Tab bar position" description="Place tabs across the top or along the left edge.">
                    <select
                        className={selectClassName}
                        value={tabBar}
                        onChange={(e) => setConfigValue({ "app:tabbar": e.target.value })}
                    >
                        {TAB_BAR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </PreferencesRow>

                <PreferencesRow label="Default new block" description="Block type created by Cmd+N and split shortcuts.">
                    <select
                        className={selectClassName}
                        value={defaultNewBlock}
                        onChange={(e) => setConfigValue({ "app:defaultnewblock": e.target.value })}
                    >
                        {DEFAULT_BLOCK_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </PreferencesRow>

                <PreferencesRow label="Tile gap size" description="Spacing between blocks in the layout grid.">
                    <select
                        className={selectClassName}
                        value={tileGapSize}
                        onChange={(e) => setConfigValue({ "window:tilegapsize": Number(e.target.value) })}
                    >
                        {TILE_GAP_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size}px
                            </option>
                        ))}
                    </select>
                </PreferencesRow>

                <PreferencesRow label="Telemetry" description="Share anonymous usage data to help improve Termon.">
                    <Toggle
                        checked={telemetryEnabled}
                        onChange={(value) => setConfigValue({ "telemetry:enabled": value })}
                    />
                </PreferencesRow>

                <PreferencesRow
                    label="Default AI mode"
                    description="Starting mode for new AI chats. Configure API keys in waveai.json."
                >
                    <div className="flex flex-col items-end gap-2">
                        <select
                            className={selectClassName}
                            value={defaultAiMode}
                            onChange={(e) => setConfigValue({ "waveai:defaultmode": e.target.value })}
                        >
                            {aiModes.length === 0 ? (
                                <option value={defaultAiMode}>{defaultAiMode}</option>
                            ) : (
                                aiModes.map(({ mode, config }) => (
                                    <option key={mode} value={mode}>
                                        {getModeDisplayName(config)}
                                    </option>
                                ))
                            )}
                        </select>
                        <button
                            type="button"
                            className="text-xs text-accent hover:underline cursor-pointer"
                            onClick={openWaveAiConfig}
                        >
                            Edit waveai.json
                        </button>
                    </div>
                </PreferencesRow>

                <PreferencesRow label="SSH config" description="Hosts for the SSH panel are read from this file.">
                    <div className="text-xs text-secondary font-mono max-w-[200px] truncate" title={sshConfigPath}>
                        {sshConfigPath}
                    </div>
                </PreferencesRow>
            </div>
            <div className="pt-3 mt-2 border-t border-border flex-shrink-0">
                <button
                    type="button"
                    className={cn(
                        "w-full px-3 py-2 text-sm text-secondary rounded border border-border",
                        "hover:bg-hoverbg hover:text-white transition-colors cursor-pointer"
                    )}
                    onClick={openAdvancedSettings}
                >
                    Advanced Settings (JSON)
                </button>
            </div>
        </FlexiModal>
    );
};

PreferencesModal.displayName = "PreferencesModal";

export { PreferencesModal };
