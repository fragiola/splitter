import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
// the playground's port (vite.config.ts reads the same variable)
const PORT = Number(process.env.PLAYGROUND_PORT ?? 5173);

// The shell, the scenarios and the unstyled fixtures (fixtures/<name>/index.html), served by the
// dev server: the packages from their sources, nothing built.
export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: CI,
    retries: CI ? 2 : 0,
    // pointer and focus timing is sensitive to a contended dev server: few workers in CI
    workers: CI ? 2 : 4,
    reporter: CI ? [["line"], ["html", { open: "never" }]] : "line",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "on-first-retry",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    ],
    webServer: {
        command: "pnpm dev",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
    },
});
