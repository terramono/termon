// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Tooltip } from "@/app/element/tooltip";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { useWaveEnv, WaveEnv, WaveEnvSubset } from "@/app/waveenv/waveenv";
import { shouldIncludeWidgetForWorkspace } from "@/app/workspace/widgetfilter";
import { modalsModel } from "@/store/modalmodel";
import { fireAndForget, isBlank, makeIconClass } from "@/util/util";
import {
    autoUpdate,
    FloatingPortal,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import AnthropicIcon from "../asset/claude-color.svg";
import CodexIcon from "../asset/codex-color.svg";
import CursorIcon from "../asset/cursor-color.svg";
import CogSolidIcon from "../asset/cog-solid.svg";
import PerplexityIcon from "../asset/perplexity.svg";
import PixelIconLibraryIcon from "../asset/pixel-icon-library.svg";
import TermonCharaImage from "../asset/termon-chara.png";

export type WidgetsEnv = WaveEnvSubset<{
    isDev: WaveEnv["isDev"];
    electron: {
        openBuilder: WaveEnv["electron"]["openBuilder"];
    };
    rpc: {
        ListAllAppsCommand: WaveEnv["rpc"]["ListAllAppsCommand"];
    };
    atoms: {
        fullConfigAtom: WaveEnv["atoms"]["fullConfigAtom"];
        hasConfigErrors: WaveEnv["atoms"]["hasConfigErrors"];
        workspaceId: WaveEnv["atoms"]["workspaceId"];
        hasCustomAIPresetsAtom: WaveEnv["atoms"]["hasCustomAIPresetsAtom"];
    };
    createBlock: WaveEnv["createBlock"];
    showContextMenu: WaveEnv["showContextMenu"];
}>;

function sortByDisplayOrder(wmap: { [key: string]: WidgetConfigType }): WidgetConfigType[] {
    if (wmap == null) {
        return [];
    }
    const wlist = Object.values(wmap);
    wlist.sort((a, b) => {
        return (a["display:order"] ?? 0) - (b["display:order"] ?? 0);
    });
    return wlist;
}

type WidgetPropsType = {
    widget: WidgetConfigType;
    mode: "normal" | "compact" | "supercompact";
    env: WidgetsEnv;
    onSelect?: (widget: WidgetConfigType) => void;
};

async function handleWidgetSelect(widget: WidgetConfigType, env: WidgetsEnv) {
    const blockDef = widget.blockdef;
    env.createBlock(blockDef, widget.magnified);
}

type CliLauncherId = "claude" | "cursor" | "codex";

type CliLauncherConfig = {
    recentsKey: string;
    cmd: string;
    title: string;
    description: string;
    metaKey: string;
    Icon: ComponentType<{ className?: string }>;
};

const MAX_CLI_LAUNCHER_RECENTS = 8;

const CLI_LAUNCHERS: Record<CliLauncherId, CliLauncherConfig> = {
    claude: {
        recentsKey: "waveterm:claude-launcher-recents",
        cmd: "claude",
        title: "Open Claude Code",
        description: "Open Claude Code",
        metaKey: "claude:launcher",
        Icon: AnthropicIcon,
    },
    cursor: {
        recentsKey: "waveterm:cursor-launcher-recents",
        cmd: "agent",
        title: "Open Cursor Agent",
        description: "Open Cursor Agent",
        metaKey: "cursor:launcher",
        Icon: CursorIcon,
    },
    codex: {
        recentsKey: "waveterm:codex-launcher-recents",
        cmd: "codex",
        title: "Open Codex",
        description: "Open Codex",
        metaKey: "codex:launcher",
        Icon: CodexIcon,
    },
};

function getCliLauncherId(widget: WidgetConfigType): CliLauncherId | null {
    const meta = widget?.blockdef?.meta ?? {};
    for (const [id, config] of Object.entries(CLI_LAUNCHERS) as [CliLauncherId, CliLauncherConfig][]) {
        if (meta[config.metaKey] === true) {
            return id;
        }
    }
    return null;
}

function isTerminalWidget(widget: WidgetConfigType): boolean {
    const meta = widget?.blockdef?.meta ?? {};
    const widgetLabel = (widget?.label ?? "").toLowerCase().trim();
    const widgetIcon = (widget?.icon ?? "").toLowerCase().trim();
    const controller = (meta.controller ?? "").toLowerCase();
    return (
        meta.view === "term" ||
        controller === "shell" ||
        controller === "cmd" ||
        widgetLabel === "terminal" ||
        widgetLabel === "term" ||
        widgetIcon.includes("terminal")
    );
}

function loadCliLauncherRecents(recentsKey: string): string[] {
    const raw = localStorage.getItem(recentsKey);
    if (raw == null) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((entry) => typeof entry === "string" && !isBlank(entry));
    } catch {
        return [];
    }
}

function saveCliLauncherRecents(recentsKey: string, recents: string[]) {
    localStorage.setItem(recentsKey, JSON.stringify(recents.slice(0, MAX_CLI_LAUNCHER_RECENTS)));
}

function updateCliLauncherRecents(recentsKey: string, dir: string): string[] {
    const trimmedDir = dir.trim();
    if (isBlank(trimmedDir)) {
        return loadCliLauncherRecents(recentsKey);
    }
    const existing = loadCliLauncherRecents(recentsKey).filter((entry) => entry !== trimmedDir);
    const next = [trimmedDir, ...existing].slice(0, MAX_CLI_LAUNCHER_RECENTS);
    saveCliLauncherRecents(recentsKey, next);
    return next;
}

const Widget = memo(({ widget, mode, env, onSelect }: WidgetPropsType) => {
    const widgetMeta = widget?.blockdef?.meta ?? {};
    const launcherId = getCliLauncherId(widget);
    const isClaudeWidget = launcherId === "claude" || (launcherId == null && isTerminalWidget(widget));
    const launcherConfig = launcherId != null ? CLI_LAUNCHERS[launcherId] : isClaudeWidget ? CLI_LAUNCHERS.claude : null;
    const isFilesWidget = widgetMeta.view === "preview" && widgetMeta.file === "~";
    const isBrowserWidget = widgetMeta.view === "web";
    const isSysinfoWidget = widgetMeta.view === "sysinfo";
    const fallbackWidgetColor =
        isFilesWidget || isBrowserWidget || isSysinfoWidget ? "var(--accent-color)" : undefined;
    const widgetColor = !isBlank(widget.color) ? widget.color : fallbackWidgetColor;
    const displayDescription = launcherConfig?.description ?? widget.description;
    const LauncherIcon = launcherConfig?.Icon;

    return (
        <Tooltip
            content={displayDescription}
            placement="left"
            disable={isBlank(displayDescription)}
            divClassName={clsx(
                "flex flex-col justify-center items-center w-full py-2 pr-0.5 text-secondary overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer",
                mode === "supercompact" ? "text-sm" : "text-lg",
                widget["display:hidden"] && "hidden"
            )}
            divOnClick={() => (onSelect ? onSelect(widget) : handleWidgetSelect(widget, env))}
        >
            <div style={{ color: widgetColor }}>
                {LauncherIcon != null ? (
                    <LauncherIcon className="w-[1em] h-[1em]" />
                ) : isFilesWidget ? (
                    <PixelIconLibraryIcon className="w-[1em] h-[1em]" />
                ) : isBrowserWidget ? (
                    <PerplexityIcon className="w-[1em] h-[1em]" />
                ) : (
                    <i className={makeIconClass(widget.icon, true, { defaultIcon: "browser" })}></i>
                )}
            </div>
        </Tooltip>
    );
});

type CliLauncherFloatingWindowProps = {
    launcherId: CliLauncherId;
    isOpen: boolean;
    onClose: () => void;
};

const CliLauncherFloatingWindow = memo(({ launcherId, isOpen, onClose }: CliLauncherFloatingWindowProps) => {
    const env = useWaveEnv<WidgetsEnv>();
    const launcherConfig = CLI_LAUNCHERS[launcherId];
    const LauncherIcon = launcherConfig.Icon;
    const [recents, setRecents] = useState<string[]>([]);
    const [customPath, setCustomPath] = useState("");
    const folderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setRecents(loadCliLauncherRecents(launcherConfig.recentsKey));
    }, [isOpen, launcherConfig.recentsKey]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    const launchCliForDir = useCallback(
        (dir: string) => {
            const targetDir = dir.trim();
            if (isBlank(targetDir)) {
                return;
            }
            const blockDef: BlockDef = {
                meta: {
                    view: "term",
                    controller: "cmd",
                    cmd: launcherConfig.cmd,
                    "cmd:interactive": true,
                    "cmd:cwd": targetDir,
                },
            };
            env.createBlock(blockDef, true);
            setRecents(updateCliLauncherRecents(launcherConfig.recentsKey, targetDir));
            setCustomPath("");
            onClose();
        },
        [env, launcherConfig.cmd, launcherConfig.recentsKey, onClose]
    );

    const handleBrowseFolder = useCallback(() => {
        folderInputRef.current?.click();
    }, []);

    const handleFolderPicked = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files == null || files.length === 0) {
                return;
            }
            const firstFilePath = env.electron.getPathForFile(files[0]);
            if (isBlank(firstFilePath)) {
                return;
            }
            const normalizedPath = firstFilePath.replace(/\\/g, "/");
            const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
            if (!isBlank(parentDir)) {
                launchCliForDir(parentDir);
            }
            event.target.value = "";
        },
        [env, launchCliForDir]
    );

    if (!isOpen) {
        return null;
    }

    return (
        <FloatingPortal>
            <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35"
                onClick={onClose}
            >
                <div
                    className="bg-modalbg border border-border rounded-xl shadow-xl p-3 w-[380px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 text-primary mb-2">
                        <div className="flex items-center gap-2">
                            <LauncherIcon className="w-4 h-4" />
                            <div className="font-medium text-sm">{launcherConfig.title}</div>
                        </div>
                        <button type="button" className="text-secondary hover:text-primary text-sm px-1" onClick={onClose}>
                            <i className="fa fa-solid fa-xmark" />
                        </button>
                    </div>
                    <div className="text-xs text-secondary mb-3">Choose a recent folder, browse, or paste a path.</div>

                    <div className="max-h-48 overflow-auto mb-3 border border-border rounded-lg">
                        {recents.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-secondary">No recent folders yet.</div>
                        ) : (
                            recents.map((dir) => (
                                <button
                                    key={dir}
                                    type="button"
                                    onClick={() => launchCliForDir(dir)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-hoverbg transition-colors border-b border-border last:border-b-0"
                                >
                                    <div className="text-[11px] text-secondary">Recent</div>
                                    <div className="text-xs text-primary truncate">{dir}</div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <button
                            type="button"
                            onClick={handleBrowseFolder}
                            className="px-3 py-2 text-xs rounded-md border border-border bg-transparent hover:bg-hoverbg text-primary"
                        >
                            Browse Folder
                        </button>
                        <input
                            ref={folderInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFolderPicked}
                            {...({ webkitdirectory: "", directory: "" } as any)}
                        />
                        <div className="text-[11px] text-secondary">Use manual path for empty folders.</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={customPath}
                            placeholder="~/projects/my-repo"
                            onChange={(e) => setCustomPath(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    launchCliForDir(customPath);
                                }
                            }}
                            className="flex-1 h-8 px-2.5 rounded-md bg-[var(--app-bg-color)] border border-border text-xs text-primary placeholder:text-secondary outline-none focus:border-accent"
                        />
                        <button
                            type="button"
                            onClick={() => launchCliForDir(customPath)}
                            className="px-3 py-2 text-xs rounded-md bg-accent text-black hover:brightness-95 disabled:opacity-50"
                            disabled={isBlank(customPath.trim())}
                        >
                            Open
                        </button>
                    </div>
                </div>
            </div>
        </FloatingPortal>
    );
});

function calculateGridSize(appCount: number): number {
    if (appCount <= 4) return 2;
    if (appCount <= 9) return 3;
    if (appCount <= 16) return 4;
    if (appCount <= 25) return 5;
    return 6;
}

function SettingsTooltipContent({ hasConfigErrors }: { hasConfigErrors: boolean }) {
    if (!hasConfigErrors) {
        return "Settings & Help";
    }
    return (
        <div className="flex flex-col p-1">
            <div className="mb-1">Settings &amp; Help</div>
            <div className="flex items-center gap-1 mt-0.5 text-error">
                <i className="fa fa-solid fa-circle-exclamation"></i>
                <span>Config Errors</span>
            </div>
        </div>
    );
}

type FloatingWindowPropsType = {
    isOpen: boolean;
    onClose: () => void;
    referenceElement: HTMLElement;
    hasConfigErrors?: boolean;
};

const AppsFloatingWindow = memo(({ isOpen, onClose, referenceElement }: FloatingWindowPropsType) => {
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const env = useWaveEnv<WidgetsEnv>();

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: onClose,
        placement: "left-start",
        middleware: [offset(-2), shift({ padding: 12 })],
        whileElementsMounted: autoUpdate,
        elements: {
            reference: referenceElement,
        },
    });

    const dismiss = useDismiss(context);
    const { getFloatingProps } = useInteractions([dismiss]);
    const handleOpenBuilder = useCallback(() => {
        env.electron.openBuilder(null);
        onClose();
    }, [onClose, env]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchApps = async () => {
            setLoading(true);
            try {
                const allApps = await env.rpc.ListAllAppsCommand(TabRpcClient);
                const localApps = allApps
                    .filter((app) => !app.appid.startsWith("draft/"))
                    .sort((a, b) => {
                        const aName = a.appid.replace(/^local\//, "");
                        const bName = b.appid.replace(/^local\//, "");
                        return aName.localeCompare(bName);
                    });
                setApps(localApps);
            } catch (error) {
                console.error("Failed to fetch apps:", error);
                setApps([]);
            } finally {
                setLoading(false);
            }
        };

        fetchApps();
    }, [isOpen]);

    if (!isOpen) return null;

    const gridSize = calculateGridSize(apps.length);

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl z-50 overflow-hidden"
            >
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                        </div>
                    ) : apps.length === 0 ? (
                        <div className="text-muted text-sm p-4 text-center">No local apps found</div>
                    ) : (
                        <div
                            className="grid gap-3"
                            style={{
                                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                                maxWidth: `${gridSize * 80}px`,
                            }}
                        >
                            {apps.map((app) => {
                                const appMeta = app.manifest?.appmeta;
                                const displayName = app.appid.replace(/^local\//, "");
                                const icon = appMeta?.icon || "cube";
                                const iconColor = appMeta?.iconcolor || "white";

                                return (
                                    <div
                                        key={app.appid}
                                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-hoverbg cursor-pointer transition-colors"
                                        onClick={() => {
                                            const blockDef: BlockDef = {
                                                meta: {
                                                    view: "tsunami",
                                                    controller: "tsunami",
                                                    "tsunami:appid": app.appid,
                                                },
                                            };
                                            env.createBlock(blockDef);
                                            onClose();
                                        }}
                                    >
                                        <div style={{ color: iconColor }} className="text-3xl mb-1">
                                            <i className={makeIconClass(icon, false)}></i>
                                        </div>
                                        <div className="text-xxs text-center text-secondary break-words w-full px-1">
                                            {displayName}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    className="w-full px-4 py-2 border-t border-border text-xs text-secondary text-center hover:bg-hoverbg hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                    onClick={handleOpenBuilder}
                >
                    <i className="fa fa-solid fa-hammer"></i>
                    Build/Edit Apps
                </button>
            </div>
        </FloatingPortal>
    );
});

const SettingsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement, hasConfigErrors }: FloatingWindowPropsType) => {
        const env = useWaveEnv<WidgetsEnv>();
        const { refs, floatingStyles, context } = useFloating({
            open: isOpen,
            onOpenChange: onClose,
            placement: "left-start",
            middleware: [offset(-2), shift({ padding: 12 })],
            whileElementsMounted: autoUpdate,
            elements: {
                reference: referenceElement,
            },
        });

        const dismiss = useDismiss(context);
        const { getFloatingProps } = useInteractions([dismiss]);

        if (!isOpen) return null;

        const menuItems = [
            {
                icon: "gear",
                label: "Settings",
                hasError: hasConfigErrors,
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "waveconfig",
                        },
                    };
                    env.createBlock(blockDef, false, true);
                    onClose();
                },
            },
            {
                icon: "lightbulb",
                label: "Tips",
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "tips",
                        },
                    };
                    env.createBlock(blockDef, true, true);
                    onClose();
                },
            },
            {
                icon: "lock",
                label: "Secrets",
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "waveconfig",
                            file: "secrets",
                        },
                    };
                    env.createBlock(blockDef, false, true);
                    onClose();
                },
            },
            {
                icon: "book-open",
                label: "Release Notes",
                onClick: () => {
                    modalsModel.pushModal("UpgradeOnboardingPatch", { isReleaseNotes: true });
                    onClose();
                },
            },
            {
                icon: "circle-question",
                label: "Help",
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "help",
                        },
                    };
                    env.createBlock(blockDef);
                    onClose();
                },
            },
        ];

        return (
            <FloatingPortal>
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="bg-modalbg border border-border rounded-lg shadow-xl p-2 z-50"
                >
                    {menuItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-hoverbg cursor-pointer transition-colors text-secondary hover:text-white"
                            onClick={item.onClick}
                        >
                            <div className="text-lg w-5 flex justify-center">
                                <i className={makeIconClass(item.icon, false)}></i>
                            </div>
                            <div className="text-sm whitespace-nowrap">{item.label}</div>
                            {item.hasError && (
                                <i className="fa fa-solid fa-circle-exclamation text-error text-[14px] ml-auto"></i>
                            )}
                        </div>
                    ))}
                </div>
            </FloatingPortal>
        );
    }
);

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";

const Widgets = memo(() => {
    const env = useWaveEnv<WidgetsEnv>();
    const fullConfig = useAtomValue(env.atoms.fullConfigAtom);
    const hasConfigErrors = useAtomValue(env.atoms.hasConfigErrors);
    const workspaceId = useAtomValue(env.atoms.workspaceId);
    const [mode, setMode] = useState<"normal" | "compact" | "supercompact">("normal");
    const containerRef = useRef<HTMLDivElement>(null);
    const measurementRef = useRef<HTMLDivElement>(null);

    const featureWaveAppBuilder = fullConfig?.settings?.["feature:waveappbuilder"] ?? false;
    const widgetsMap = fullConfig?.widgets ?? {};
    const filteredWidgets = Object.fromEntries(
        Object.entries(widgetsMap).filter(([_key, widget]) => shouldIncludeWidgetForWorkspace(widget, workspaceId))
    );
    const widgets = sortByDisplayOrder(filteredWidgets);

    const [isAppsOpen, setIsAppsOpen] = useState(false);
    const appsButtonRef = useRef<HTMLDivElement>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLDivElement>(null);
    const [activeCliLauncher, setActiveCliLauncher] = useState<CliLauncherId | null>(null);

    const checkModeNeeded = useCallback(() => {
        if (!containerRef.current || !measurementRef.current) return;

        const containerHeight = containerRef.current.clientHeight;
        const normalHeight = measurementRef.current.scrollHeight;
        const gracePeriod = 10;

        let newMode: "normal" | "compact" | "supercompact" = "normal";

        if (normalHeight > containerHeight - gracePeriod) {
            newMode = "compact";

            // Calculate total widget count for supercompact check
            const totalWidgets = (widgets?.length || 0) + 1;
            const minHeightPerWidget = 32;
            const requiredHeight = totalWidgets * minHeightPerWidget;

            if (requiredHeight > containerHeight) {
                newMode = "supercompact";
            }
        }

        if (newMode !== mode) {
            setMode(newMode);
        }
    }, [mode, widgets]);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            checkModeNeeded();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [checkModeNeeded]);

    useEffect(() => {
        checkModeNeeded();
    }, [widgets, checkModeNeeded]);

    const handleWidgetsBarContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const menu: ContextMenuItem[] = [
            {
                label: "Edit widgets.json",
                click: () => {
                    fireAndForget(async () => {
                        const blockDef: BlockDef = {
                            meta: {
                                view: "waveconfig",
                                file: "widgets.json",
                            },
                        };
                        await env.createBlock(blockDef, false, true);
                    });
                },
            },
        ];
        env.showContextMenu(menu, e);
    };

    const handleWidgetPress = useCallback(
        (widget: WidgetConfigType) => {
            const launcherId = getCliLauncherId(widget);
            if (launcherId != null) {
                setActiveCliLauncher(launcherId);
                return;
            }
            if (isTerminalWidget(widget)) {
                setActiveCliLauncher("claude");
                return;
            }
            handleWidgetSelect(widget, env);
        },
        [env]
    );

    return (
        <>
            <div
                ref={containerRef}
                className="flex flex-col w-12 overflow-hidden py-1 -ml-1 select-none shrink-0"
                onContextMenu={handleWidgetsBarContextMenu}
            >
                {mode === "supercompact" ? (
                    <>
                        <div className="grid grid-cols-2 gap-0 w-full">
                            {widgets?.map((data, idx) => (
                                <Widget key={`widget-${idx}`} widget={data} mode={mode} env={env} onSelect={handleWidgetPress} />
                            ))}
                        </div>
                        <div className="flex-grow" />
                        <div className="grid grid-cols-2 gap-0 w-full">
                            {env.isDev() || featureWaveAppBuilder ? (
                                <div
                                    ref={appsButtonRef}
                                    className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                    onClick={() => setIsAppsOpen(!isAppsOpen)}
                                >
                                    <Tooltip content="Local WaveApps" placement="left" disable={isAppsOpen}>
                                        <div>
                                            <i className={makeIconClass("cube", true)}></i>
                                        </div>
                                    </Tooltip>
                                </div>
                            ) : null}
                            <div
                                ref={settingsButtonRef}
                                className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            >
                                <Tooltip
                                    content={<SettingsTooltipContent hasConfigErrors={hasConfigErrors} />}
                                    placement="left"
                                    disable={isSettingsOpen}
                                >
                                    <div className="relative">
                                        <CogSolidIcon className="w-[1em] h-[1em]" />
                                        {hasConfigErrors && (
                                            <i className="fa fa-solid fa-circle-exclamation text-error absolute top-0 right-0 text-[10px] pointer-events-none"></i>
                                        )}
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {widgets?.map((data, idx) => (
                            <Widget key={`widget-${idx}`} widget={data} mode={mode} env={env} onSelect={handleWidgetPress} />
                        ))}
                        <div className="flex-grow" />
                        {env.isDev() || featureWaveAppBuilder ? (
                            <div
                                ref={appsButtonRef}
                                className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                onClick={() => setIsAppsOpen(!isAppsOpen)}
                            >
                                <Tooltip content="Local WaveApps" placement="left" disable={isAppsOpen}>
                                    <div>
                                        <i className={makeIconClass("cube", true)}></i>
                                    </div>
                                </Tooltip>
                            </div>
                        ) : null}
                        <div
                            ref={settingsButtonRef}
                            className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        >
                            <Tooltip
                                content={<SettingsTooltipContent hasConfigErrors={hasConfigErrors} />}
                                placement="left"
                                disable={isSettingsOpen}
                            >
                                    <div className="relative">
                                        <CogSolidIcon className="w-[1em] h-[1em]" />
                                        {hasConfigErrors && (
                                            <i
                                                className={`fa fa-solid fa-circle-exclamation text-error absolute top-0 right-[-4px] pointer-events-none ${mode === "normal" ? "text-[14px]" : "text-[12px]"}`}
                                            ></i>
                                        )}
                                </div>
                            </Tooltip>
                        </div>
                    </>
                )}
                <div className="flex justify-center items-center w-full py-1" title="Termon mascot">
                    <img src={TermonCharaImage} alt="Termon mascot" className="w-7 h-7 object-contain" />
                </div>
            </div>
            {(env.isDev() || featureWaveAppBuilder) && appsButtonRef.current && (
                <AppsFloatingWindow
                    isOpen={isAppsOpen}
                    onClose={() => setIsAppsOpen(false)}
                    referenceElement={appsButtonRef.current}
                />
            )}
            {settingsButtonRef.current && (
                <SettingsFloatingWindow
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    referenceElement={settingsButtonRef.current}
                    hasConfigErrors={hasConfigErrors}
                />
            )}
            {activeCliLauncher != null && (
                <CliLauncherFloatingWindow
                    launcherId={activeCliLauncher}
                    isOpen={activeCliLauncher != null}
                    onClose={() => setActiveCliLauncher(null)}
                />
            )}

            <div
                ref={measurementRef}
                className="flex flex-col w-12 py-1 -ml-1 select-none absolute -z-10 opacity-0 pointer-events-none"
            >
                {widgets?.map((data, idx) => (
                    <Widget key={`measurement-widget-${idx}`} widget={data} mode="normal" env={env} />
                ))}
                <div className="flex-grow" />
                <div className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-lg">
                    <div>
                        <CogSolidIcon className="w-[1em] h-[1em]" />
                    </div>
                </div>
                {env.isDev() ? (
                    <div className="flex flex-col justify-center items-center w-full py-2 pr-0.5 text-lg">
                        <div>
                            <i className={makeIconClass("cube", true)}></i>
                        </div>
                    </div>
                ) : null}
                <div className="flex justify-center items-center w-full py-1">
                    <img src={TermonCharaImage} alt="" className="w-7 h-7 object-contain" />
                </div>
            </div>
        </>
    );
});

export { Widgets };
