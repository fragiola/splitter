import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every HTML page this repository serves (the embed apps, the playground and its fixtures) is a
// fragment or a dev tool, never a page for search engines (site export contract v1.2, §5.1).

const root = join(import.meta.dirname, "../..");

const pages = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "*.html"],
    {
        cwd: root,
        encoding: "utf8",
    },
)
    .split("\n")
    .filter((path) => path !== "");

describe("the HTML pages", () => {
    it("exist: the embed, the playground and its fixtures", () => {
        expect(pages).toContain("examples/react/index.html");
        expect(pages).toContain("apps/playground/index.html");
        expect(
            pages.some((path) => path.startsWith("apps/playground/fixtures/")),
        ).toBe(true);
    });

    it('each carry <meta name="robots" content="noindex">', () => {
        for (const path of pages) {
            expect(readFileSync(join(root, path), "utf8"), path).toMatch(
                /<meta\s+name="robots"\s+content="noindex"\s*\/?>/,
            );
        }
    });
});
