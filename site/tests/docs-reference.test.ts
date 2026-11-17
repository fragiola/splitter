// From Dockable (fragiola/dockable, site/tests/docs-reference.test.ts), same author and licence,
// rewritten for Splitter's packages.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The API reference is written by hand, and this test keeps it honest.
//
// Why by hand: Fumadocs generates prop tables with fumadocs-typescript (`AutoTypeTable`), which
// drives the TypeScript compiler API. This repo pins TypeScript 7, the native compiler, which
// ships no JavaScript compiler API, so the tables live in site/docs/api/*.mdx and the checks below
// fail when the sources and the pages drift apart:
//
// - every export of @fragiola/splitter-react (index.ts, and the parts of parts.ts) is on its
//   reference page, and every field of every exported props, state, options or result type is a
//   row of its page's tables (following `extends` into the package's own interfaces);
// - the core pages mention every export of the core, list every key of the model's and the
//   engine's verbs, every member of the model, the engine and its adapter, every error code,
//   every field of the JSON document, the state and the command bus types, and every command of
//   the registry has its section on the generated commands page.
//
// Interfaces are read with regular expressions (fields are the 4-space-indented `name?:` lines of
// an `export interface … {` block), which is enough for this codebase's formatting (Biome).

const ROOT = join(import.meta.dirname, "../..");
const REACT_SRC = join(ROOT, "packages/react/src");
const CORE_SRC = join(ROOT, "packages/core/src");
const API = join(import.meta.dirname, "../docs/api");

const read = (path: string) => readFileSync(path, "utf-8");
const page = (slug: string) => read(join(API, `${slug}.mdx`));

/** What the test reads of a command in the core's registry. */
interface CommandInfo {
    name: string;
    payloadSchema: { properties?: Record<string, unknown> };
    resultSchema: { properties?: Record<string, unknown> };
}

// the core's registry, loaded at run time from its source: a computed path keeps the site's
// typecheck from checking the core too (it has its own)
const core = (await import(join(CORE_SRC, "index.ts"))) as {
    createSplitterModel(): { get(key: "commands"): readonly CommandInfo[] };
};

/** The reference page of each module the React package exports from. */
const MODULE_PAGES: Record<string, string> = {
    "./components/group": "group",
    "./components/panel": "panel",
    "./components/separator": "separator",
    "./hooks/use-group": "hooks",
    "./hooks/use-panel": "hooks",
    "./hooks/use-separator": "hooks",
    "./hooks/use-splitter": "hooks",
    "./hooks/use-splitter-state": "hooks",
    "./hooks/use-splitter-ref": "external-ref",
    "./utils/use-render": "group",
};

interface Export {
    name: string;
    module: string;
}

/** `export { a, type B } from "./x"` and `export type { … } from "./x"` statements. */
function namedExports(source: string): Export[] {
    const exports: Export[] = [];
    for (const match of source.matchAll(
        /export (?:type )?\{([^}]*)\} from "([^"]+)"/g,
    )) {
        const [, names = "", module = ""] = match;
        for (const raw of names.split(",")) {
            const name = raw
                .trim()
                .replace(/^type\s+/, "")
                .split(/\s+as\s+/)
                .pop();
            if (name) exports.push({ name, module });
        }
    }
    return exports;
}

/**
 * The fields of `export interface <name> … { … }` (or of `export type <name> … = { … }`) in
 * `source`, or undefined when absent. `extendsNames` are the names in its heritage clause.
 */
function interfaceFields(
    source: string,
    name: string,
): { fields: string[]; extendsNames: string[] } | undefined {
    const declared = new RegExp(
        `export interface ${name}\\b([^{]*)\\{([\\s\\S]*?)\\n\\}`,
    ).exec(source);
    const aliased = new RegExp(
        `export type ${name}\\b(?:<[^>]*>)?\\s*= \\{([\\s\\S]*?)\\n\\}`,
    ).exec(source);
    if (!declared && !aliased) return undefined;
    const heritage = declared?.[1] ?? "";
    const body = (declared ? declared[2] : aliased?.[1]) ?? "";
    const fields = [...body.matchAll(/^ {4}(?:readonly )?(\w+)\??:/gm)].map(
        (field) => field[1] ?? "",
    );
    // the bases after `extends`: not the type parameters (`<T extends …>`), not type arguments
    const bases = heritage
        .replace(/^\s*<[^>]*>/, "")
        .replace(/<[^>]*>/g, "")
        .replace(/^\s*extends\b/, "");
    const extendsNames = [...bases.matchAll(/\b([A-Z]\w*)\b/g)].map(
        (base) => base[1] ?? "",
    );
    return { fields, extendsNames };
}

/** Every `.ts`/`.tsx` file under `dir`. */
function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { recursive: true, encoding: "utf-8" })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => join(dir, file));
}

const REACT_FILES = sourceFiles(REACT_SRC).map(read);
const CORE_FILES = sourceFiles(CORE_SRC).map(read);

/** Fields of an interface, following `extends` into the interfaces the packages declare. */
function allFields(source: string, name: string): string[] {
    const found = interfaceFields(source, name);
    if (!found) return [];
    const inherited = found.extendsNames.flatMap((base) => {
        const declaring = [...REACT_FILES, ...CORE_FILES].find((file) =>
            interfaceFields(file, base),
        );
        return declaring ? allFields(declaring, base) : [];
    });
    return [...found.fields, ...inherited];
}

/** The names in the first cell of every markdown table row: `` | `a`, `b(…)` | `` gives a and b. */
function tableRowNames(mdx: string): Set<string> {
    const names = new Set<string>();
    for (const match of mdx.matchAll(/^\|([^|\n]*)\|/gm)) {
        for (const code of (match[1] ?? "").matchAll(/`([^`]+)`/g)) {
            const cell = (code[1] ?? "").replace(/^"|"$/g, "");
            names.add(cell.split(/[(<\s]/)[0] ?? cell);
        }
    }
    return names;
}

/** `name` appears in the page as code: `` `name` ``, `` `name<…>` ``, `` `name(…)` ``, `` `name.x` ``. */
function mentions(mdx: string, name: string): boolean {
    return new RegExp(`\`${name}[\`<(.]`).test(mdx);
}

/** `key` appears in the page as a quoted key in code: `` `"layout-by"` ``. */
function mentionsKey(mdx: string, key: string): boolean {
    return mdx.includes(`\`"${key}"\``);
}

/** The keys of the registry `export interface <name> { … }`: `measure`, `"layout-by"`, … */
function registryKeys(source: string, name: string): string[] {
    const body =
        new RegExp(
            `export interface ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`,
        ).exec(source)?.[1] ?? "";
    return [...body.matchAll(/^ {4}"?([\w-]+)"?:/gm)].map(
        (match) => match[1] ?? "",
    );
}

/** The members of `export interface <name> … { … }`: fields and methods. */
function members(source: string, name: string): string[] {
    const start = source.indexOf(`export interface ${name}`);
    const body = source.slice(start, source.indexOf("\n}\n", start));
    return [
        ...new Set(
            [...body.matchAll(/^ {4}(?:readonly )?(\w+)[<(:?]/gm)].map(
                (match) => match[1] ?? "",
            ),
        ),
    ];
}

const index = read(join(REACT_SRC, "index.ts"));
const parts = read(join(REACT_SRC, "parts.ts"));
const indexExports = namedExports(index);
const partExports = namedExports(parts);

function sourceOf(module: string): string {
    const base = join(REACT_SRC, module.replace(/^\.\//, ""));
    try {
        return read(`${base}.tsx`);
    } catch {
        return read(`${base}.ts`);
    }
}

describe("the React reference", () => {
    it("has a page for every module the package exports from", () => {
        const modules = new Set(indexExports.map((entry) => entry.module));
        for (const module of modules) {
            expect(
                MODULE_PAGES,
                `no reference page for ${module}`,
            ).toHaveProperty(module);
        }
    });

    it("re-exports the core and exports the Splitter namespace from parts.ts", () => {
        expect(index).toMatch(/^export \* from "@fragiola\/splitter";$/m);
        expect(index).toMatch(/export \* as Splitter from "\.\/parts"/);
    });

    it("documents every part as Splitter.<Part> on its own page, titled by the part alone", () => {
        expect(partExports.map((entry) => entry.name).sort()).toEqual([
            "Group",
            "Panel",
            "Separator",
        ]);
        for (const { name, module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            const mdx = page(slug);
            // the title never repeats the project's name: www appends it (CONTRACT §3.6)
            expect(mdx, `api/${slug}.mdx`).toMatch(
                new RegExp(`^title: ${name}$`, "m"),
            );
            expect(mdx, `api/${slug}.mdx`).toContain(`\`Splitter.${name}\``);
        }
    });

    it("mentions every named export on its module's page", () => {
        for (const { name, module } of indexExports) {
            const slug = MODULE_PAGES[module] ?? "";
            expect(
                mentions(page(slug), name),
                `${name} on api/${slug}.mdx`,
            ).toBe(true);
        }
    });

    it("has a table row for every field of every exported interface", () => {
        let checked = 0;
        for (const { name, module } of indexExports) {
            const fields = allFields(sourceOf(module), name);
            const slug = MODULE_PAGES[module] ?? "";
            const rows = tableRowNames(page(slug));
            for (const field of fields) {
                checked++;
                expect(
                    rows.has(field),
                    `${name}.${field} has no row on api/${slug}.mdx`,
                ).toBe(true);
            }
        }
        // the parser found the interfaces (a formatting change must not silently pass)
        expect(checked).toBeGreaterThan(60);
    });

    it("has a row for every prop of every part, its own and its options'", () => {
        for (const { name, module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            const source = sourceOf(module);
            expect(source, `${name}Props in ${module}`).toMatch(
                new RegExp(`export interface ${name}Props\\b`),
            );
            const fields = allFields(source, `${name}Props`);
            expect(fields).toContain("children");
            const rows = tableRowNames(page(slug));
            for (const field of fields) {
                expect(
                    rows.has(field),
                    `${name}.${field} on api/${slug}.mdx`,
                ).toBe(true);
            }
        }
        // Panel's props are its options: a new option must reach the table
        expect(allFields(sourceOf("./components/panel"), "PanelProps")).toEqual(
            expect.arrayContaining([
                "minSize",
                "groupResizeBehavior",
                "onExpand",
            ]),
        );
    });

    it("documents the common props on the group page, linked from every part", () => {
        const common = allFields(
            read(join(REACT_SRC, "utils/use-render.ts")),
            "PrimitiveProps",
        );
        expect(common).toEqual(["render", "className", "style", "ref"]);
        const rows = tableRowNames(page("group"));
        for (const field of common) expect(rows.has(field), field).toBe(true);
        for (const { module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            expect(page(slug), `api/${slug}.mdx`).toContain(
                "/docs/api/group#common-props",
            );
        }
    });

    it("gives every part page its data-* attributes and its path", () => {
        for (const { module } of partExports) {
            const slug = MODULE_PAGES[module] ?? "";
            const mdx = page(slug);
            expect(mdx, `api/${slug}.mdx`).toContain("`data-splitter-path`");
            expect(mdx, `api/${slug}.mdx`).toContain("`data-splitter-part`");
        }
    });
});

describe("the core reference", () => {
    const commands = core.createSplitterModel().get("commands");
    const commandsPage = page("commands");
    const apiPages = readdirSync(API)
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => read(join(API, file)));

    it("has a section on the generated commands page for every command of the registry", () => {
        expect(commands.length).toBeGreaterThan(10);
        for (const info of commands) {
            expect(commandsPage, info.name).toContain(`### \`${info.name}\``);
        }
    });

    it("mentions every export of the core on an API page", () => {
        const source = read(join(CORE_SRC, "index.ts"));
        expect(source).not.toMatch(/export \* from/);
        const names = namedExports(source).map((entry) => entry.name);
        expect(names.length).toBeGreaterThan(100);
        const missing = names.filter(
            (name) => !apiPages.some((mdx) => mentions(mdx, name)),
        );
        expect(missing, "exports no API page mentions").toEqual([]);
    });

    it("lists every key of the model's get and is", () => {
        const source = read(join(CORE_SRC, "state/queries.ts"));
        const keys = [
            ...registryKeys(source, "ModelGetMap"),
            ...registryKeys(source, "ModelIsMap"),
        ];
        expect(keys.length).toBeGreaterThan(20);
        const mdx = page("model");
        for (const key of keys) {
            expect(mentionsKey(mdx, key), `"${key}" on api/model.mdx`).toBe(
                true,
            );
        }
    });

    it("documents every member of the model", () => {
        const source = read(join(CORE_SRC, "state/model.ts"));
        const found = members(source, "SplitterModel<");
        expect(found.sort()).toEqual(
            [
                "can",
                "check",
                "dispatch",
                "get",
                "is",
                "run",
                "subscribe",
                "use",
            ].sort(),
        );
        const mdx = page("model") + page("command-bus");
        const rows = tableRowNames(mdx);
        for (const member of found) {
            expect(rows.has(member), `SplitterModel.${member}`).toBe(true);
        }
    });

    it("documents the command bus and every error code", () => {
        const source = read(join(CORE_SRC, "commands/types.ts"));
        const union =
            /export type CommandErrorCode =([^;]+);/.exec(source)?.[1] ?? "";
        const codes = [...union.matchAll(/"(\w+)"/g)].map((m) => m[1] ?? "");
        expect(codes.length).toBeGreaterThan(5);
        const mdx = page("command-bus");
        const rows = tableRowNames(mdx);
        for (const code of codes) {
            expect(rows.has(code), `error code ${code}`).toBe(true);
        }
        for (const name of [
            "CommandError",
            "RunOptions",
            "CommandEvent",
            "CommandInfo",
            "CommandContextBase",
        ]) {
            const fields = interfaceFields(source, name)?.fields ?? [];
            expect(fields.length, name).toBeGreaterThan(1);
            for (const field of fields) {
                expect(rows.has(field), `${name}.${field}`).toBe(true);
            }
        }
    });

    it("has a table row for every field of the JSON document", () => {
        const source = read(join(CORE_SRC, "state/types.ts"));
        const rows = tableRowNames(page("json-document"));
        for (const name of ["SplitterJson", "GroupJson", "PanelJson"]) {
            const fields = interfaceFields(source, name)?.fields ?? [];
            expect(fields.length, name).toBeGreaterThan(1);
            for (const field of fields) {
                expect(rows.has(field), `${name}.${field}`).toBe(true);
            }
        }
    });

    it("has a table row for every field of the state, the constraints and the measures", () => {
        const rows = tableRowNames(page("model"));
        let checked = 0;
        for (const [file, names] of [
            [
                "state/types.ts",
                [
                    "SplitterState",
                    "GroupState",
                    "PanelState",
                    "PanelConstraints",
                    "SeparatorState",
                    "SeparatorOptions",
                ],
            ],
            ["state/queries.ts", ["PanelSize"]],
            ["state/model.ts", ["SplitterModelOptions"]],
            ["layout/types.ts", ["ResolvedConstraints"]],
            ["units/resolve-size.ts", ["GroupMeasure"]],
        ] as const) {
            const source = read(join(CORE_SRC, file));
            for (const name of names) {
                const fields = interfaceFields(source, name)?.fields ?? [];
                expect(fields.length, name).toBeGreaterThan(0);
                for (const field of fields) {
                    checked++;
                    expect(rows.has(field), `${name}.${field}`).toBe(true);
                }
            }
        }
        expect(checked).toBeGreaterThan(40);
    });

    it("documents every member of the engine and of its adapter, and its options", () => {
        const source = read(join(CORE_SRC, "engine/splitter-engine.ts"));
        const engine = members(source, "SplitterEngine {");
        expect(engine.sort()).toEqual(
            [
                "adapter",
                "can",
                "check",
                "dispatch",
                "get",
                "is",
                "run",
                "subscribe",
                "use",
            ].sort(),
        );
        const adapter = members(source, "SplitterEngineAdapter");
        expect(adapter.length).toBeGreaterThan(4);
        const options = interfaceFields(source, "SplitterEngineOptions");
        const rows = tableRowNames(page("engine"));
        for (const member of [
            ...engine,
            ...adapter,
            ...(options?.fields ?? []),
        ]) {
            expect(rows.has(member), `${member} on api/engine.mdx`).toBe(true);
        }
    });

    it("lists every key of the engine's run, get and is", () => {
        const source = read(join(CORE_SRC, "engine/verbs.ts"));
        const keys = [
            ...registryKeys(source, "EngineActionMap"),
            ...registryKeys(source, "EngineGetMap"),
            ...registryKeys(source, "EngineIsMap"),
        ];
        expect(keys.length).toBeGreaterThan(6);
        const mdx = page("engine");
        for (const key of keys) {
            expect(mentionsKey(mdx, key), `"${key}" on api/engine.mdx`).toBe(
                true,
            );
        }
    });

    it("documents the external ref and its handle", () => {
        const source = read(join(CORE_SRC, "engine/splitter-ref.ts"));
        const rows = tableRowNames(page("external-ref"));
        for (const member of [
            ...members(source, "SplitterRef {"),
            ...members(source, "SplitterHandle"),
        ]) {
            expect(rows.has(member), `${member} on api/external-ref.mdx`).toBe(
                true,
            );
        }
    });
});
