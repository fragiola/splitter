import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSplitterEngine } from "../src/engine/splitter-engine";
import { createSplitterModel } from "../src/state/model";

const root = join(import.meta.dirname, "..");
const src = join(root, "src");

function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

/** Source text with comments and string literals blanked out, so only code is scanned. */
function codeOnly(source: string): string {
    return source.replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g,
        (match) => (match.startsWith("/") ? "" : '""'),
    );
}

// the core never reaches for the browser globals: DOM access goes through an element's
// ownerDocument/defaultView, so it runs inside an iframe or a popup, and loads in Node
const GLOBAL_DOM =
    /(?<![.\w$])(document|window|requestAnimationFrame|cancelAnimationFrame|ResizeObserver|getComputedStyle|navigator|localStorage|sessionStorage|matchMedia)\b(?!\s*\??:)/;
const GLOBAL_CRYPTO = /(?<![.\w$])crypto\b(?!\s*:)/;

/** Node's own modules and globals: the core runs in a browser too. */
const NODE_ONLY =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:node:[^"']+|fs|path|os|process)["']|(?<![.\w$])(?:process|Buffer|__dirname)\b(?!\s*:)/;

const IMPORT_FRAMEWORK =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:react|react-dom|vue|@vue\/[^"']+|@angular\/[^"']+|svelte|solid-js|preact)(?:\/[^"']*)?["']/;

/** Any import that is not a relative path: the core has no runtime dependency. */
const PACKAGE_IMPORT =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?!\.)[^"']+["']/;

/**
 * The files whose algorithm is derived from React Resizable Panels: they keep its MIT header
 * (AGENTS.md, Provenance).
 */
const PORTED = [
    "src/layout/numbers.ts",
    "src/layout/validate-panel-size.ts",
    "src/layout/adjust-layout-by-delta.ts",
    "src/layout/validate-layout.ts",
    "src/layout/default-layout.ts",
    "src/layout/preserve-pixel-sizes.ts",
    "src/layout/resize-panel.ts",
    "src/layout/separator-values.ts",
    "tests/layout/adjust-layout-by-delta.test.ts",
    "tests/layout/validate-layout.test.ts",
    "tests/commands/panel-resize.test.ts",
];

/** A file's leading line comments, joined into one sentence. */
function headOf(file: string): string {
    return (
        /^(?:\/\/[^\n]*\n)+/.exec(readFileSync(file, "utf8"))?.[0] ?? ""
    ).replace(/\s*\n\/\/\s*|\s+/g, " ");
}

/** The exported declarations of a source (comments and strings already blanked). */
function exportedDeclarations(source: string): string[] {
    const declarations: string[] = [];
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (!line.startsWith("export ")) {
            continue;
        }
        const block = [line];
        if (!/;\s*$/.test(line) && !/^export \{.*\}.*;?$/.test(line)) {
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j] ?? "";
                block.push(next);
                if (/^[}\]);]/.test(next)) {
                    break;
                }
            }
        }
        declarations.push(block.join("\n"));
    }
    return declarations;
}

/** The members of an object that are functions (the bound verbs). */
function functionMembers(value: object): string[] {
    return Object.keys(value)
        .filter(
            (key) =>
                typeof (value as Record<string, unknown>)[key] === "function",
        )
        .sort();
}

const VERBS = [
    "can",
    "check",
    "dispatch",
    "get",
    "is",
    "run",
    "subscribe",
    "use",
];

describe("core package guard", () => {
    it("has no runtime or peer dependencies", () => {
        const pkg = JSON.parse(
            readFileSync(join(root, "package.json"), "utf8"),
        ) as Record<string, unknown>;
        expect(pkg.dependencies ?? {}).toEqual({});
        expect(pkg.peerDependencies ?? {}).toEqual({});
    });

    it("imports nothing but its own modules", () => {
        const offenders = listFiles(src).filter((file) =>
            PACKAGE_IMPORT.test(readFileSync(file, "utf8")),
        );
        expect(offenders).toEqual([]);
        expect(PACKAGE_IMPORT.test('import { x } from "./x";')).toBe(false);
        expect(PACKAGE_IMPORT.test('import { x } from "lodash";')).toBe(true);
    });

    it("never imports a framework (React, Vue, Angular, …)", () => {
        const offenders = listFiles(src).filter((file) =>
            IMPORT_FRAMEWORK.test(readFileSync(file, "utf8")),
        );
        expect(offenders).toEqual([]);
        expect(
            IMPORT_FRAMEWORK.test('import type * as React from "react";'),
        ).toBe(true);
        expect(
            IMPORT_FRAMEWORK.test(
                'import { createPortal } from "react-dom/client";',
            ),
        ).toBe(true);
        expect(IMPORT_FRAMEWORK.test('import { h } from "vue";')).toBe(true);
        expect(
            IMPORT_FRAMEWORK.test('import { Component } from "@angular/core";'),
        ).toBe(true);
        expect(IMPORT_FRAMEWORK.test('import { x } from "./reactive";')).toBe(
            false,
        );
    });

    it("never touches global document, window, ResizeObserver or frame scheduling", () => {
        const offenders = listFiles(src).flatMap((file) => {
            const match = GLOBAL_DOM.exec(codeOnly(readFileSync(file, "utf8")));
            return match ? [`${file}: ${match[0]}`] : [];
        });
        expect(offenders).toEqual([]);
        expect(
            GLOBAL_DOM.test(codeOnly("document.createElement('div');")),
        ).toBe(true);
        expect(
            GLOBAL_DOM.test(codeOnly("requestAnimationFrame(() => {});")),
        ).toBe(true);
        expect(GLOBAL_DOM.test(codeOnly("new ResizeObserver(cb);"))).toBe(true);
        expect(
            GLOBAL_DOM.test(
                codeOnly("el.ownerDocument.defaultView.ResizeObserver"),
            ),
        ).toBe(false);
        expect(GLOBAL_DOM.test(codeOnly("// the window\nconst x = 1;"))).toBe(
            false,
        );
        expect(GLOBAL_DOM.test(codeOnly("function f(window: Window) {}"))).toBe(
            false,
        );
    });

    it("never reaches for the global crypto (ids come from an injectable createId)", () => {
        const offenders = listFiles(src).flatMap((file) => {
            const match = GLOBAL_CRYPTO.exec(
                codeOnly(readFileSync(file, "utf8")),
            );
            return match ? [`${file}: ${match[0]}`] : [];
        });
        expect(offenders).toEqual([]);
        expect(GLOBAL_CRYPTO.test(codeOnly("crypto.randomUUID()"))).toBe(true);
    });

    it("uses nothing only Node has", () => {
        const offenders = listFiles(src).flatMap((file) => {
            const match = NODE_ONLY.exec(codeOnly(readFileSync(file, "utf8")));
            return match ? [`${file}: ${match[0]}`] : [];
        });
        expect(offenders).toEqual([]);
        expect(NODE_ONLY.test('import { readFileSync } from "node:fs";')).toBe(
            true,
        );
        expect(NODE_ONLY.test(codeOnly("process.env.X"))).toBe(true);
    });

    it("has no `any` in its exported declarations", () => {
        const offenders = listFiles(src).flatMap((file) =>
            exportedDeclarations(codeOnly(readFileSync(file, "utf8")))
                .filter((declaration) => /\bany\b/.test(declaration))
                .map((declaration) => `${file}: ${declaration.slice(0, 80)}`),
        );
        expect(offenders).toEqual([]);
        expect(
            exportedDeclarations("export type X = any;\nconst y: any = 1;"),
        ).toEqual(["export type X = any;"]);
    });

    it("has no CSS class names and writes no cursor or style", () => {
        const offenders = listFiles(src).filter((file) =>
            /\b(className|classList|\.style\b|cursor)/.test(
                codeOnly(readFileSync(file, "utf8")),
            ),
        );
        expect(offenders).toEqual([]);
    });

    it("every file derived from React Resizable Panels carries its MIT header", () => {
        const missing = PORTED.map((file) => join(root, file)).filter(
            (file) => {
                if (!existsSync(file)) {
                    return true;
                }
                const head = (
                    /^(?:\/\/[^\n]*\n)+/.exec(
                        readFileSync(file, "utf8"),
                    )?.[0] ?? ""
                ).replace(/\s*\n\/\/\s*|\s+/g, " ");
                return !(
                    head.includes("React Resizable Panels") &&
                    head.includes("Copyright (c) 2018 Brian Vaughn") &&
                    head.includes("MIT")
                );
            },
        );
        expect(missing).toEqual([]);
    });

    it("lists every file that names React Resizable Panels as its origin", () => {
        const files = [...listFiles(src), ...listFiles(join(root, "tests"))]
            .filter((file) => !file.endsWith("guard.test.ts"))
            .filter((file) => headOf(file).includes("React Resizable Panels"))
            .map((file) => file.slice(root.length + 1))
            .sort();
        expect(files).toEqual([...PORTED].sort());
    });

    it("ships the React Resizable Panels notice in every licence", () => {
        const rootLicence = readFileSync(
            join(root, "..", "..", "LICENSE"),
            "utf8",
        );
        expect(rootLicence).toContain("Copyright (c) 2018 Brian Vaughn");
        for (const pkg of ["core", "react"]) {
            expect(readFileSync(join(root, "..", pkg, "LICENSE"), "utf8")).toBe(
                rootLicence,
            );
        }
    });

    it("the model exposes exactly the five verbs, use, subscribe and dispatch", () => {
        const model = createSplitterModel();
        expect(functionMembers(model)).toEqual(VERBS);
    });

    it("the engine exposes exactly the same verbs, and adapter", () => {
        const engine = createSplitterEngine(createSplitterModel());
        expect(functionMembers(engine)).toEqual(VERBS);
        const { adapter } = engine;
        expect(Object.keys(adapter).sort()).toEqual([
            "bindGroup",
            "bindPanel",
            "bindSeparator",
            "destroy",
            "syncOrder",
            "syncSeparators",
        ]);
    });
});
