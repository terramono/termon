// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { WebServerEndpointVarName, WSServerEndpointVarName } from "../frontend/util/endpoints";
import { WaveDevVarName } from "../frontend/util/isdev";

const AllowedEnvVars = new Set([WebServerEndpointVarName, WSServerEndpointVarName, WaveDevVarName]);

export function getAllowedEnvVar(varName: string): string | null {
    if (!varName || typeof varName !== "string") {
        return null;
    }
    if (!AllowedEnvVars.has(varName)) {
        return null;
    }
    return process.env[varName] ?? null;
}
