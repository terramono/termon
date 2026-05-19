// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import path from "path";

export function expandHomeInPath(filePath: string, homeDir: string): string | null {
    if (!filePath || typeof filePath !== "string") {
        return null;
    }
    if (filePath.includes("\0")) {
        return null;
    }
    if (filePath === "~") {
        return homeDir;
    }
    if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
        return path.join(homeDir, filePath.slice(2));
    }
    return filePath;
}

export function sanitizeSaveFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
        return "session.log";
    }
    const base = path.basename(fileName);
    if (!base || base === "." || base === "..") {
        return "session.log";
    }
    return base.replace(/[^\w.\-()+ ]/g, "_");
}

export function isValidQuicklookPath(filePath: string): boolean {
    if (!filePath || typeof filePath !== "string") {
        return false;
    }
    if (filePath.includes("\0")) {
        return false;
    }
    if (filePath.startsWith("-")) {
        return false;
    }
    return true;
}
