// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import path from "path";
import { getElectronAppBasePath } from "./emain-platform";

export function makeSecureWebPreferences(): Electron.WebPreferences {
    return {
        preload: path.join(getElectronAppBasePath(), "preload", "index.cjs"),
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
    };
}
