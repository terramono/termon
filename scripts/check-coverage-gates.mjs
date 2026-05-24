// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const configPath = join(scriptDir, "coverage-gates.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

function pct(hit, found) {
    if (!found) {
        return 0;
    }
    return (100 * hit) / found;
}

function parseLcov(lcovText, pathPrefix) {
    const records = lcovText.split("end_of_record\n").filter(Boolean);
    let hit = 0;
    let found = 0;
    for (const rec of records) {
        const sfMatch = rec.match(/^SF:(.+)$/m);
        if (!sfMatch) {
            continue;
        }
        const file = sfMatch[1];
        if (!file.includes(pathPrefix)) {
            continue;
        }
        for (const line of rec.split("\n")) {
            const lm = line.match(/^DA:(\d+),(\d+)$/);
            if (lm) {
                found++;
                if (+lm[2] > 0) {
                    hit++;
                }
            }
        }
    }
    return { hit, found, percent: pct(hit, found) };
}

function parseGoCoverProfile(profileText) {
    let hit = 0;
    let found = 0;
    for (const line of profileText.split("\n")) {
        if (line.startsWith("mode:")) {
            continue;
        }
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) {
            continue;
        }
        const stmts = Number.parseInt(parts[1], 10);
        const count = Number.parseInt(parts[2], 10);
        if (Number.isNaN(stmts)) {
            continue;
        }
        found += stmts;
        if (count > 0) {
            hit += stmts;
        }
    }
    return { hit, found, percent: pct(hit, found) };
}

function measureGate(gate) {
    if (gate.kind === "lcov") {
        const lcovPath = join(repoRoot, "coverage/lcov.info");
        const lcovText = readFileSync(lcovPath, "utf8");
        return parseLcov(lcovText, gate.pathPrefix);
    }
    if (gate.kind === "go") {
        const profilePath = join(repoRoot, "coverage-pkgutil.out");
        const packages = gate.goPackages.join(" ");
        const result = execSync(`go test -coverprofile=${profilePath} ${packages}`, {
            cwd: repoRoot,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, GOTOOLCHAIN: "auto" },
        });
        if (result.stderr?.length) {
            const stderr = result.stderr.toString();
            const noisyOnly = stderr
                .split("\n")
                .every((line) => line === "" || line.startsWith("#") || line.includes("no such tool"));
            if (!noisyOnly) {
                process.stderr.write(stderr);
            }
        }
        const profileText = readFileSync(profilePath, "utf8");
        return parseGoCoverProfile(profileText);
    }
    throw new Error(`unknown gate kind: ${gate.kind}`);
}

const filterArg = process.argv.find((arg) => arg.startsWith("--"));
const filter = filterArg?.slice(2) ?? "all";

let failed = false;
console.log("Coverage gate check\n");

for (const gate of config.gates) {
    if (filter === "frontend" && gate.kind !== "lcov") {
        continue;
    }
    if (filter === "go" && gate.kind !== "go") {
        continue;
    }
    const result = measureGate(gate);
    const pass = result.percent + 1e-9 >= gate.minPercent;
    const status = pass ? "PASS" : "FAIL";
    const targetNote = gate.targetPercent ? ` (ratchet target ${gate.targetPercent}%)` : "";
    console.log(
        `[${status}] ${gate.name}: ${result.percent.toFixed(1)}% ${gate.metric} ` +
            `(${result.hit}/${result.found}) — min ${gate.minPercent}%${targetNote}`
    );
    if (!pass) {
        failed = true;
    }
}

if (failed) {
    console.error("\nOne or more coverage gates failed.");
    process.exit(1);
}

console.log("\nAll coverage gates passed.");
