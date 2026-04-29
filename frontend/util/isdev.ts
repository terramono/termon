// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getEnv } from "./getenv";
import { lazy } from "./util";

export const WaveDevVarName = "WAVETERM_DEV";

/**
 * Determines whether the current app instance is a development build.
 * @returns True if the current app instance is a development build.
 */
export const isDev = lazy(() => !!getEnv(WaveDevVarName));

