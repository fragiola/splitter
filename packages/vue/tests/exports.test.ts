import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@fragiola/splitter";
import { describe, expect, it } from "vitest";
import * as vue from "../src/index";

// The package's surface: the whole core, and the React adapter's names in Vue.

const read = (path: string) =>
    readFileSync(join(import.meta.dirname, "..", path), "utf-8");

/** What only the Vue package exports, and why. */
const VUE_ONLY = [
    // a Vue template cannot pass a type argument (`<Splitter.Panel<Types>>` in React)
    "typedSplitter",
];

/** The files under `src/`. */
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

// the React package's sources, loaded at run time (a variable path: the Vue typecheck does not
// follow it into React's TSX)
const reactEntry = join(import.meta.dirname, "../../react/src/index.ts");
const react = (await import(reactEntry)) as Record<string, unknown> & {
    Splitter: Record<string, unknown>;
};

describe("@fragiola/splitter-vue", () => {
    it("re-exports the whole core", () => {
        expect(read("src/index.ts")).toMatch(
            /^export \* from "@fragiola\/splitter";$/m,
        );
    });

    it("exports every runtime export of the core, identical", () => {
        const exported = new Map(Object.entries(vue));
        const runtime = Object.entries(core);
        expect(runtime.length).toBeGreaterThan(0);
        for (const [name, value] of runtime) {
            expect(exported.get(name), name).toBe(value);
        }
    });

    it("exports the React package's runtime names, and the Vue-only ones", () => {
        const vueNames = Object.keys(vue)
            .filter((name) => !VUE_ONLY.includes(name))
            .sort();
        expect(vueNames).toEqual(Object.keys(react).sort());
        for (const name of VUE_ONLY) {
            expect(Object.keys(vue)).toContain(name);
        }
    });

    it("has the React package's primitives in its Splitter namespace", () => {
        expect(Object.keys(vue.Splitter).sort()).toEqual(
            Object.keys(react.Splitter).sort(),
        );
    });

    it("typedSplitter returns the same primitives", () => {
        const typed = vue.typedSplitter();
        expect(typed.Group).toBe(vue.Splitter.Group);
        expect(typed.Panel).toBe(vue.Splitter.Panel);
        expect(typed.Separator).toBe(vue.Splitter.Separator);
    });

    it("never imports React, and imports nothing at runtime but vue and the core", () => {
        const pkg = JSON.parse(read("package.json")) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        expect(Object.keys(pkg.dependencies ?? {})).toEqual([
            "@fragiola/splitter",
        ]);
        expect(Object.keys(pkg.peerDependencies ?? {})).toEqual(["vue"]);
        const IMPORT = /(?:from\s+|import\s*\(\s*)["']([^"'.][^"']*)["']/g;
        for (const file of sources()) {
            for (const [, specifier] of readFileSync(file, "utf8").matchAll(
                IMPORT,
            )) {
                expect(["vue", "@fragiola/splitter"], file).toContain(
                    specifier,
                );
            }
        }
    });
});
