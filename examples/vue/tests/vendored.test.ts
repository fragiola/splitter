// From Grid Layout (fragiola/grid-layout, examples/vue/tests/vendored.test.ts), same author and licence.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Fragiola UI theme (the palettes, the base stylesheet) and `cn` are vendored into
// examples/react by its scripts/vendor-fragiola.ts; this app copies them, so the Vue examples wear
// the React examples' classes. A copy is the original with its first line (the vendoring header)
// replaced. The kit (`_kit/`, framework-free app policy) and every example's `styles.ts` are
// copied as they are: the Vue markup binds the same classes to the same parts.

const here = join(import.meta.dirname, "..");
const react = join(here, "..", "react");

function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

const COPIES = [
    ...listFiles(join(here, "src/styles")),
    join(here, "src/lib/cn.ts"),
].map((file) => relative(here, file));

const EXAMPLES = join(here, "src/examples");

const SAME = listFiles(EXAMPLES)
    .filter((file) => /\/(_kit\/[^/]+|styles)\.ts$/.test(file))
    .map((file) => relative(here, file));

const body = (source: string) => source.slice(source.indexOf("\n") + 1);

describe("the files copied from examples/react", () => {
    it.each(COPIES)("%s", (file) => {
        const copy = readFileSync(join(here, file), "utf8");
        const original = readFileSync(join(react, file), "utf8");
        expect(copy.split("\n")[0]).toContain(
            `Copied from examples/react/${file}`,
        );
        expect(body(copy)).toBe(body(original));
    });

    it("cover every palette examples/react vendors", () => {
        const names = (dir: string) => readdirSync(dir).sort();
        expect(names(join(here, "src/styles/palettes"))).toEqual(
            names(join(react, "src/styles/palettes")),
        );
    });

    it("include the kit and every example's styles.ts", () => {
        expect(SAME).toContain("src/examples/_kit/undo.ts");
        expect(SAME).toContain("src/examples/_kit/persistence.ts");
        for (const slug of readdirSync(EXAMPLES)) {
            if (slug === "_kit" || slug.endsWith(".md")) continue;
            expect(SAME).toContain(`src/examples/${slug}/styles.ts`);
        }
    });

    it.each(SAME)("%s, as it is", (file) => {
        expect(readFileSync(join(here, file), "utf8")).toBe(
            readFileSync(join(react, file), "utf8"),
        );
    });
});
