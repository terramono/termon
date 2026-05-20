import { UserConfig, defineConfig, mergeConfig } from "vitest/config";
import electronViteConfig from "./electron.vite.config";

export default mergeConfig(
    electronViteConfig.renderer as UserConfig,
    defineConfig({
        test: {
            reporters: ["verbose", "junit"],
            outputFile: {
                junit: "test-results.xml",
            },
            coverage: {
                provider: "istanbul",
                all: false,
                include: ["frontend/**/*.{ts,tsx}"],
                exclude: [
                    "**/*.test.{ts,tsx}",
                    "**/*.d.ts",
                    "frontend/types/**",
                    "frontend/app/store/wshclientapi.ts",
                    "frontend/app/store/services.ts",
                    "dist/**",
                    "make/**",
                    "emain/**",
                    "node_modules/**",
                    "coverage/**",
                ],
                reporter: ["text-summary", "lcov"],
                reportsDirectory: "./coverage",
            },
            typecheck: {
                tsconfig: "tsconfig.json",
            },
        },
    })
);
