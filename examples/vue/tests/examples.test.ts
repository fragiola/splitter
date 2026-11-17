// From Grid Layout (fragiola/grid-layout, examples/vue/tests/examples.test.ts), same author and licence.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
    collectFiles,
    type ExampleEntry,
    examplesApp,
    importsOf,
    listExampleSlugs,
    loadExamples,
} from "examples-shared/scripts/examples-lib";
import { beforeAll, describe, expect, it } from "vitest";

// The Vue side of the example contract: an example is single-file components (`index.vue` its
// entry) and `styles.ts`, importing only what a consumer can copy: `vue`, the Vue package, the
// kit (`#/components/…`, `#/lib/cn`) and relative files inside examples/. Every example
// assembles the splitter itself, keeps the id it has in examples/react, and binds its classes
// from `styles.ts`. What every framework shares (the metadata) is checked in examples/shared/tests.

const APP = examplesApp("vue");
const EXAMPLES_DIR = APP.examplesDir;

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^vue$/,
    // the Vue package re-exports the core: an example never imports @fragiola/splitter
    /^@fragiola\/splitter-vue$/,
    /^@lucide\/vue$/,
    /^#\/components\/(ui|atoms)\/[a-z-]+$/,
    /^#\/lib\/cn$/,
];

/** Site files under examples/ that are not example code. */
const SITE_FILES = [/\.generated\.ts$/, /\.md$/, /\.css$/];

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

let examples: ExampleEntry[] = [];
beforeAll(async () => {
    examples = await loadExamples(APP);
});

describe("the Vue examples", () => {
    const slugs = listExampleSlugs(APP);

    it("are all in the manifest, each with a valid meta", () => {
        expect(examples.map((e) => e.slug).sort()).toEqual(slugs);
    });

    it("are every example of examples/react, with the same ids", () => {
        // Vue is a complete framework (examples/shared/e2e/available.ts): it ships every example
        expect(slugs.length).toBeGreaterThan(0);
        expect(slugs).toEqual(listExampleSlugs(examplesApp("react")));
    });

    it("import only what a consumer can copy", () => {
        const files = walk(EXAMPLES_DIR)
            .map((file) => relative(EXAMPLES_DIR, file))
            .filter(
                (file) => !SITE_FILES.some((pattern) => pattern.test(file)),
            );
        for (const file of files) {
            const source = readFileSync(join(EXAMPLES_DIR, file), "utf-8");
            for (const specifier of importsOf(source)) {
                if (specifier.startsWith(".")) continue;
                expect(
                    ALLOWED.some((pattern) => pattern.test(specifier)),
                    `${file} imports "${specifier}"`,
                ).toBe(true);
            }
        }
    });

    it.each(slugs)("%s shows its entry first in the code panel", (slug) => {
        const { files } = collectFiles(APP, slug);
        expect(files[0]).toBe(`${slug}/index.vue`);
        expect(examples.find((e) => e.slug === slug)?.files).toEqual(files);
    });

    it.each(slugs)("%s assembles the splitter itself", (slug) => {
        const source = readFileSync(
            join(EXAMPLES_DIR, slug, "index.vue"),
            "utf-8",
        );
        expect(source).toMatch(/<Splitter\.Group\b/);
    });

    it.each(slugs)("%s keeps class strings out of its templates", (slug) => {
        expect(
            statSync(join(EXAMPLES_DIR, slug, "styles.ts"), {
                throwIfNoEntry: false,
            })?.isFile(),
        ).toBe(true);
        for (const file of walk(join(EXAMPLES_DIR, slug))) {
            if (!file.endsWith(".vue")) continue;
            const source = readFileSync(file, "utf-8");
            const template = source.slice(source.indexOf("<template>"));
            // looks go in styles.ts and are bound (`:class="styles.part"`)
            expect(
                /\sclass="/.test(template),
                relative(EXAMPLES_DIR, file),
            ).toBe(false);
            expect(/\bcn\(/.test(template), relative(EXAMPLES_DIR, file)).toBe(
                false,
            );
        }
    });

    it("use the app's API only: never engine.adapter (an adapter's side)", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!/\.(ts|vue)$/.test(file)) continue;
            expect(
                readFileSync(file, "utf-8"),
                relative(EXAMPLES_DIR, file),
            ).not.toMatch(/\.adapter\b/);
        }
    });
});

describe("the Vue kit", () => {
    it("renders no Splitter primitive: the examples assemble the splitter", () => {
        for (const file of walk(join(EXAMPLES_DIR, "_kit"))) {
            expect(
                importsOf(readFileSync(file, "utf-8")),
                relative(EXAMPLES_DIR, file),
            ).not.toContain("@fragiola/splitter-vue");
        }
    });

    it("holds no styles: classes live in each example's styles.ts", () => {
        for (const file of walk(join(EXAMPLES_DIR, "_kit"))) {
            if (!file.endsWith(".vue")) continue;
            const source = readFileSync(file, "utf-8");
            const template = source.slice(source.indexOf("<template>"));
            expect(
                /\sclass="|\bcn\(/.test(template),
                relative(EXAMPLES_DIR, file),
            ).toBe(false);
        }
    });
});
