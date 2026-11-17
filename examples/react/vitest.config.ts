import { defineConfig } from "vitest/config";
import { examplesTestResolve } from "./vite.shared.ts";

export default defineConfig({
    ...examplesTestResolve(),
    test: {
        name: "examples-react",
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
