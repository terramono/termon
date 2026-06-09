// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { cn } from "@/util/util";
import { WaveAIModel } from "./waveai-model";

interface BYOKAnnouncementProps {
    prominent?: boolean;
}

const BYOKAnnouncement = ({ prominent = false }: BYOKAnnouncementProps) => {
    const model = WaveAIModel.getInstance();

    const handleOpenConfig = async () => {
        RpcApi.RecordTEventCommand(
            TabRpcClient,
            {
                event: "action:other",
                props: {
                    "action:type": "waveai:configuremodes:panel",
                },
            },
            { noresponse: true }
        );
        await model.openWaveAIConfig();
    };

    const handleViewDocs = () => {
        RpcApi.RecordTEventCommand(
            TabRpcClient,
            {
                event: "action:other",
                props: {
                    "action:type": "waveai:viewdocs:panel",
                },
            },
            { noresponse: true }
        );
    };

    return (
        <div
            className={
                prominent
                    ? "bg-accent/10 border-2 border-accent/40 rounded-lg p-5"
                    : "bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4"
            }
        >
            <div className="flex items-start gap-3">
                <i className={cn("fa fa-key text-lg mt-0.5", prominent ? "text-accent text-xl" : "text-blue-400")}></i>
                <div className="text-left flex-1">
                    <div className={cn("font-medium mb-1", prominent ? "text-accent text-base" : "text-blue-400")}>
                        {prominent ? "Set up your AI provider" : "New: BYOK & Local AI Support"}
                    </div>
                    <div className="text-secondary text-sm mb-3">
                        {prominent
                            ? "Telemetry is off by default in Termon. Configure a custom AI mode with your own API key or a local model (Ollama, LM Studio, etc.) to start chatting."
                            : "Wave AI supports bring-your-own-key (BYOK) with OpenAI, Google Gemini, Azure, and OpenRouter, plus local models via Ollama, LM Studio, and other OpenAI-compatible providers."}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleOpenConfig}
                            className={
                                prominent
                                    ? "bg-accent/80 hover:bg-accent text-primary px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors"
                                    : "border border-blue-400 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors"
                            }
                        >
                            Configure AI Modes
                        </button>
                        <a
                            href="https://docs.waveterm.dev/waveai-modes"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleViewDocs}
                            className="text-blue-400! hover:text-blue-300! hover:underline text-sm cursor-pointer transition-colors flex items-center gap-1"
                        >
                            View Docs <i className="fa fa-external-link text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

BYOKAnnouncement.displayName = "BYOKAnnouncement";

export { BYOKAnnouncement };
