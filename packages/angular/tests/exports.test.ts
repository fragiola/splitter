import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@fragiola/splitter";
import { describe, expect, it } from "vitest";
import * as angular from "../src/public-api";

const read = (path: string) =>
    readFileSync(join(import.meta.dirname, "..", path), "utf-8");

/**
 * The runtime names a module of another adapter exports, read from its source (its files are not
 * this package's to compile): `export * as X`, `export { … }` lists without their `type`
 * specifiers, and exported `const`, `function` and `class` declarations.
 */
function runtimeNames(source: string): string[] {
    const names = [
        ...[...source.matchAll(/^export\s+\*\s+as\s+(\w+)/gm)].map(
            ([, name]) => name,
        ),
        ...[
            ...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm),
        ].map(([, name]) => name),
        ...[...source.matchAll(/^export\s+\{([^}]*)\}/gm)].flatMap(
            ([, list = ""]) =>
                list
                    .split(",")
                    .map((raw) => raw.trim())
                    .filter((raw) => raw !== "" && !raw.startsWith("type "))
                    .map((raw) => raw.split(/\s+as\s+/).at(-1)),
        ),
    ];
    return [...new Set(names.filter((name) => name !== undefined))];
}

const react = runtimeNames(read("../react/src/index.ts"));
const vue = runtimeNames(read("../vue/src/index.ts"));
/** React's primitives (`Splitter.X`), from its namespace module. */
const reactParts = runtimeNames(read("../react/src/parts.ts"));
/** React's hooks (`useX`). */
const reactHooks = react.filter((name) => /^use[A-Z]/.test(name));

/** `useGroup` → `injectGroup`; a ref is made by the core's `createSplitterRef`, in any class. */
const injectionOf = (hook: string) =>
    hook === "useSplitterRef"
        ? "createSplitterRef"
        : `inject${hook.slice("use".length)}`;

/** What only React has, and its Angular counterpart's name. */
const REACT_ONLY: Record<string, string> = {
    // the namespace: every directive, for a component's `imports`
    Splitter: "SPLITTER",
};

/** The files the package's sources are. */
function sources(): string[] {
    const files: string[] = [];
    const walk = (folder: string) => {
        for (const entry of readdirSync(folder, { withFileTypes: true })) {
            const full = join(folder, entry.name);
            if (entry.isDirectory()) walk(full);
            else files.push(full);
        }
    };
    walk(join(import.meta.dirname, "..", "src"));
    return files;
}

describe("@fragiola/splitter-angular", () => {
    it("re-exports the whole core, identical, so an app imports one package", () => {
        expect(read("src/public-api.ts")).toMatch(
            /^export \* from "@fragiola\/splitter";$/m,
        );
        const exported: Record<string, unknown> = { ...angular };
        for (const [name, value] of Object.entries(core)) {
            expect(exported[name], name).toBe(value);
        }
    });

    it("has a directive for every React primitive (Splitter.X → SplitterX), each in SPLITTER", () => {
        expect(reactParts).toEqual(["Group", "Panel", "Separator"]);
        for (const part of reactParts) {
            const directive = (angular as Record<string, unknown>)[
                `Splitter${part}`
            ];
            expect(directive, `Splitter.${part}`).toBeTypeOf("function");
            expect(angular.SPLITTER, `Splitter${part}`).toContain(directive);
        }
        expect(angular.SPLITTER).toHaveLength(reactParts.length);
    });

    it("has an injection function for every React hook (useX → injectX)", () => {
        expect(reactHooks.length).toBe(6);
        for (const hook of reactHooks) {
            expect(
                (angular as Record<string, unknown>)[injectionOf(hook)],
                hook,
            ).toBeTypeOf("function");
        }
    });

    it("exports nothing at runtime but the core and the counterparts of React's names", () => {
        const expected = new Set<string>();
        for (const name of react) {
            if (name in REACT_ONLY) {
                expected.add(REACT_ONLY[name] as string);
            } else if (/^use[A-Z]/.test(name)) {
                expected.add(injectionOf(name));
            } else {
                expect(name in core, name).toBe(true);
            }
        }
        for (const part of reactParts) expected.add(`Splitter${part}`);
        expect(
            Object.keys(angular)
                .filter((name) => !(name in core))
                .sort(),
        ).toEqual([...expected].filter((name) => !(name in core)).sort());
        // Vue's are React's plus `typedSplitter`: Angular infers a group's registry from its model
        expect(vue.filter((name) => !react.includes(name))).toEqual([
            "typedSplitter",
        ]);
    });

    it("imports nothing at runtime but @angular/core and the core, and depends on the core only", () => {
        const pkg = JSON.parse(read("package.json")) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        expect(Object.keys(pkg.dependencies ?? {})).toEqual([
            "@fragiola/splitter",
        ]);
        expect(Object.keys(pkg.peerDependencies ?? {})).toEqual([
            "@angular/core",
        ]);
        const IMPORT = /(?:from\s+|import\s*\(\s*)["']([^"'.][^"']*)["']/g;
        for (const file of sources()) {
            for (const [, specifier] of readFileSync(file, "utf8").matchAll(
                IMPORT,
            )) {
                expect(["@angular/core", "@fragiola/splitter"], file).toContain(
                    specifier,
                );
            }
        }
    });
});
