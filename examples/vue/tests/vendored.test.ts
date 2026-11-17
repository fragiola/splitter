// From Grid Layout (fragiola/grid-layout, examples/vue/tests/vendored.test.ts), same author and licence.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The Fragiola UI theme (the palettes, the base stylesheet) and `cn` are vendored into
// examples/react by its scripts/vendor-fragiola.ts; this app copies them, so the Vue examples wear
// the React examples' classes. A copy is the original with its first line (the vendoring header)
// replaced. The plain TypeScript of examples/react's examples (React's components are `.tsx`) is
// copied as it is: the kit (`_kit/`, framework-free app policy), every example's `styles.ts`
// (the Vue markup binds the same classes to the same parts) and an example's data and helpers
// (`messages.ts`, `render.ts`, `sample.ts`, `data.ts`, …). This app's own entry and components
// (`index.vue`, the siblings of its second components) have no counterpart there.

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

/** Copies that differ on purpose: the IDE's editor shows a Vue file (`workbench.vue`). */
const DIFFERENT = ["src/examples/ide-layout/files.ts"];

const SAME = listFiles(join(react, "src/examples"))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".generated.ts"))
    .map((file) => relative(react, file))
    .filter((file) => !DIFFERENT.includes(file));

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

    it("include the kit, every example's styles.ts and its plain siblings", () => {
        expect(SAME).toContain("src/examples/_kit/undo.ts");
        expect(SAME).toContain("src/examples/email-client/messages.ts");
        expect(SAME).toContain("src/examples/markdown-editor/render.ts");
        expect(SAME).toContain("src/examples/chat-thread/data.ts");
        expect(SAME).toContain("src/examples/database-console/sample.ts");
        expect(SAME).toContain("src/examples/_kit/persistence.ts");
        for (const slug of readdirSync(EXAMPLES)) {
            if (slug === "_kit" || slug.endsWith(".md")) continue;
            expect(SAME).toContain(`src/examples/${slug}/styles.ts`);
        }
    });

    it.each(DIFFERENT)("%s, which differs on purpose, exists", (file) => {
        expect(statSync(join(here, file)).isFile()).toBe(true);
    });

    it.each(SAME)("%s, as it is", (file) => {
        expect(readFileSync(join(here, file), "utf8")).toBe(
            readFileSync(join(react, file), "utf8"),
        );
    });
});
