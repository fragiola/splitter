// From Grid Layout (fragiola/grid-layout, examples/react/tests/examples.test.ts), same author and licence.
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
    collectFiles,
    type ExampleEntry,
    examplesApp,
    importsOf,
    listExampleSlugs as listSlugs,
    loadExamples,
} from "examples-shared/scripts/examples-lib";
import { beforeAll, describe, expect, it } from "vitest";

// The React side of the example contract (README, and `#/` imports per §6 of the site export
// contract): every example is in the manifest, imports only what a consumer can copy, the code
// panel lists exactly the files it is compiled from, and each example assembles the splitter
// itself: `_kit/` is shared demo content and copyable app policy only. What every framework shares (the
// metadata, its categories and its consistency with the folders) is checked in
// examples/shared/tests.

const APP = examplesApp("react");
const EXAMPLES_DIR = APP.examplesDir;
const listExampleSlugs = () => listSlugs(APP);

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^react$/,
    /^react-dom$/,
    // the React package re-exports the core: an example never imports @fragiola/splitter
    /^@fragiola\/splitter-react$/,
    /^lucide-react$/,
    /^#\/components\/(ui|atoms)\/[a-z-]+$/,
    /^#\/lib\/cn$/,
];

/** Whether an example may import `specifier` (relative files aside). */
function allowed(specifier: string): boolean {
    return ALLOWED.some((pattern) => pattern.test(specifier));
}

/** Site files under examples/ that are not example code. */
const SITE_FILES = [/\.generated\.ts$/, /\.md$/, /\.css$/];

const KIT = join(EXAMPLES_DIR, "_kit");

/**
 * Where an example's `.tsx` styles itself instead of reading `styles.ts`: a class string on a
 * `className`, a string inside a `className={…}` expression, or a `cn()` call. Returns each
 * offending snippet.
 */
function inlineClasses(source: string): string[] {
    const found: string[] = [];
    for (const match of source.matchAll(/\bcn\(/g)) {
        found.push(source.slice(match.index, match.index + 40));
    }
    for (const match of source.matchAll(/\bclassName=/g)) {
        const start = match.index + match[0].length;
        const open = source[start];
        if (open === '"' || open === "'") {
            found.push(source.slice(match.index, match.index + 60));
            continue;
        }
        if (open !== "{") continue;
        // the expression up to its matching brace
        let depth = 0;
        let end = start;
        for (; end < source.length; end++) {
            if (source[end] === "{") depth++;
            else if (source[end] === "}" && --depth === 0) break;
        }
        const expression = source.slice(start + 1, end);
        if (/["'`]/.test(expression)) {
            found.push(`className={${expression.slice(0, 60)}}`);
        }
    }
    return found;
}

function walk(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

let examples: ExampleEntry[] = [];

beforeAll(async () => {
    examples = await loadExamples(APP);
});

describe("the examples", () => {
    it("are all in the manifest, each with a valid meta", () => {
        expect(examples.map((e) => e.slug).sort()).toEqual(listExampleSlugs());
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
                    allowed(specifier),
                    `${file} imports "${specifier}"`,
                ).toBe(true);
            }
        }
    });

    it("show in the code panel exactly the files they are compiled from", () => {
        for (const example of examples) {
            const { files } = collectFiles(APP, example.slug);
            expect(example.files).toEqual(files);
            expect(files[0]).toBe(`${example.slug}/index.tsx`);
            // closure: every relative import of a listed file is listed too
            for (const file of files) {
                const source = readFileSync(join(EXAMPLES_DIR, file), "utf-8");
                const relativeImports = importsOf(source).filter((s) =>
                    s.startsWith("."),
                );
                for (const specifier of relativeImports) {
                    const resolved = files.some((listed) => {
                        const base = join(file, "..", specifier);
                        return [base, `${base}.ts`, `${base}.tsx`].some(
                            (candidate) =>
                                relative(
                                    EXAMPLES_DIR,
                                    join(EXAMPLES_DIR, candidate),
                                ) === listed,
                        );
                    });
                    expect(resolved, `${file} → ${specifier}`).toBe(true);
                }
            }
        }
    });

    it("refuses `@/` (reserved for packages), the core and anything else a consumer lacks", () => {
        expect(allowed("@/components/ui/switch")).toBe(false);
        expect(allowed("@/lib/cn")).toBe(false);
        expect(allowed("@fragiola/splitter")).toBe(false);
        expect(allowed("examples-shared/themes")).toBe(false);
        expect(allowed("#/components/ui/switch")).toBe(true);
        expect(allowed("@fragiola/splitter-react")).toBe(true);
    });

    it("fail on a folder without metadata", async () => {
        const root = mkdtempSync(join(tmpdir(), "examples-react-"));
        try {
            const app = examplesApp("react", root);
            mkdirSync(join(app.examplesDir, "no-such-example"), {
                recursive: true,
            });
            writeFileSync(
                join(app.examplesDir, "no-such-example", "index.tsx"),
                "export default function X() { return null; }\n",
            );
            await expect(loadExamples(app)).rejects.toThrow(
                /examples\/shared\/src\/meta\/no-such-example\.ts is missing/,
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it("assemble the splitter themselves: index.tsx renders <Splitter.Group>", () => {
        for (const slug of listExampleSlugs()) {
            const source = readFileSync(
                join(EXAMPLES_DIR, slug, "index.tsx"),
                "utf-8",
            );
            expect(source, `${slug}/index.tsx`).toMatch(/<Splitter\.Group\b/);
        }
    });

    it("keep their classes in styles.ts: no class string or cn() in a .tsx", () => {
        for (const slug of listExampleSlugs()) {
            expect(
                statSync(join(EXAMPLES_DIR, slug, "styles.ts"), {
                    throwIfNoEntry: false,
                })?.isFile(),
                `${slug}/styles.ts`,
            ).toBe(true);
            for (const file of walk(join(EXAMPLES_DIR, slug))) {
                if (!file.endsWith(".tsx")) continue;
                const source = readFileSync(file, "utf-8");
                expect(
                    inlineClasses(source),
                    relative(EXAMPLES_DIR, file),
                ).toEqual([]);
            }
        }
    });

    it("finds inline classes the styles.ts rule forbids", () => {
        expect(inlineClasses('<div className="flex" />')).toHaveLength(1);
        expect(inlineClasses("<div className={cn(a, b)} />")).toHaveLength(1);
        expect(
            inlineClasses('<div className={on ? "a" : styles.b} />'),
        ).toHaveLength(1);
        expect(inlineClasses("<div className={`x`} />")).toHaveLength(1);
        expect(
            inlineClasses(
                "<div className={styles.cell} /><p className={styles.dot(tone)} />",
            ),
        ).toEqual([]);
    });

    it("use the app's API only: never engine.adapter (an adapter's side)", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!/\.(ts|tsx)$/.test(file)) continue;
            const source = readFileSync(file, "utf-8");
            expect(source, relative(EXAMPLES_DIR, file)).not.toMatch(
                /\.adapter\b/,
            );
        }
    });
});

/**
 * A colour written as a value (hex, a colour function) or a Tailwind palette colour: the examples
 * paint with the palette roles and the theme's `--sp-*` tokens only.
 */
const FIXED_COLOUR =
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|\b(?:bg|text|border|fill|stroke|outline|ring|from|via|to|decoration|shadow|accent|caret)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/;

/** A resize cursor set without a state attribute: the cursor follows `data-orientation`. */
function cursorsWithoutState(source: string): string[] {
    return [...source.matchAll(/(\S*)cursor-(?:col|row|ew|ns)-resize/g)]
        .map(([match]) => match)
        .filter((match) => !/data-/.test(match));
}

describe("the styles", () => {
    const styles = () =>
        walk(EXAMPLES_DIR).filter((file) => file.endsWith("styles.ts"));

    it("use no fixed colour", () => {
        expect(styles().length).toBeGreaterThan(0);
        for (const file of styles()) {
            const source = readFileSync(file, "utf-8");
            expect(
                FIXED_COLOUR.exec(source)?.[0],
                relative(EXAMPLES_DIR, file),
            ).toBeUndefined();
        }
    });

    it("set the resize cursor from the separator's state attributes", () => {
        for (const file of styles()) {
            expect(
                cursorsWithoutState(readFileSync(file, "utf-8")),
                relative(EXAMPLES_DIR, file),
            ).toEqual([]);
        }
    });

    it("find what they forbid", () => {
        for (const colour of [
            "#fff",
            "oklch(0.5 0 0)",
            "bg-red-500",
            "text-white",
        ]) {
            expect(FIXED_COLOUR.test(colour), colour).toBe(true);
        }
        for (const ok of [
            "bg-palette-base",
            "border-(--sp-panel-line)",
            "text-palette-accent/85",
        ]) {
            expect(FIXED_COLOUR.test(ok), ok).toBe(false);
        }
        expect(cursorsWithoutState('"cursor-col-resize"')).toHaveLength(1);
        expect(
            cursorsWithoutState(
                '"data-[orientation=vertical]:cursor-col-resize"',
            ),
        ).toEqual([]);
    });
});

describe("the kit", () => {
    it("renders no Splitter primitive: the examples assemble the splitter", () => {
        for (const file of walk(KIT)) {
            const source = readFileSync(file, "utf-8");
            expect(
                importsOf(source),
                relative(EXAMPLES_DIR, file),
            ).not.toContain("@fragiola/splitter-react");
        }
    });

    it("holds no styles: classes live in each example's styles.ts", () => {
        for (const file of walk(KIT)) {
            if (!file.endsWith(".tsx")) continue;
            expect(
                inlineClasses(readFileSync(file, "utf-8")),
                relative(EXAMPLES_DIR, file),
            ).toEqual([]);
        }
    });
});
