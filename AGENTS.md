# Splitter

A **headless** library for resizable panel groups (split views): panels sit side by side,
horizontally or vertically, and the user resizes them by dragging a separator, with the keyboard,
or from code; groups nest. It ships behaviour, accessibility and composable primitives. It ships
**no CSS, no icons, no cursors and no text**. Styling belongs 100% to the consuming developer; the
package never assumes Tailwind, shadcn or anything else.

Its behaviour reference is React Resizable Panels (`../references/react-resizable-panels`, MIT),
flex groups only. Its architecture is Fragiola's (`../guidelines`, the `fragiola-ecosystem` skill),
shared with Dockable (`../dockable`, the reference implementation) and Grid Layout
(`../grid-layout`): a framework-free core, a typed model of commands, an engine per group on
screen, and primitives under the Fragiola primitive contract, with the keyboard and right-to-left
from day one. Where this file is silent, the guidelines decide; where they are silent, imitate
Dockable.

Every piece of logic that isn't rendering lives in the core, so a new adapter is only rendering and
wiring.

| package | name | contains | depends on |
|---|---|---|---|
| `packages/core` | `@fragiola/splitter` | the typed model and its command bus, the JSON document and its JSON Schema, the pure layout rules, units, the engine (measurement, gestures, keyboard, RTL, ARIA values) | DOM only, zero runtime deps |
| `packages/react` | `@fragiola/splitter-react` | the `Splitter.*` primitives and hooks over the core, and the whole core re-exported | the core (`workspace:*`); peers `react`, `react-dom` (^19) |
| `packages/vue` | `@fragiola/splitter-vue` | planned (Epic #10) | the core |
| `packages/angular` | `@fragiola/splitter-angular` | planned (Epic #13) | the core |

Coming in Epic #7: `apps/playground` (private dev app: scenarios, unstyled fixtures),
`examples/shared` and `examples/react` (the site's examples), and `site` (the export for
fragiola.com/splitter). Today `site/` holds only the repository checks' tests.

## Non-negotiable rules

These are the decisions of Epic #7 (D1 to D10) and the ecosystem rules they build on. A change that
breaks one is a decision for the maintainer, not an implementation detail.

1. **Names (D1).** Packages `@fragiola/splitter` (core) and `@fragiola/splitter-react`; later
   `@fragiola/splitter-vue` and `@fragiola/splitter-angular`. Repo `fragiola/splitter`;
   fragiola.com slug `splitter`, title "Splitter"; www `devUrl` `http://localhost:5184` (5183 is
   reserved by `dnd`). React namespace `Splitter`. Core creators `createSplitterModel` and
   `createSplitterEngine`; the external ref is `createSplitterRef` / `useSplitterRef`.
2. **Glossary (D2).** A **group** lays out **panels** along one **orientation**, with a
   **separator** between neighbouring panels. A panel is **collapsed** or **expanded**. A separator
   is **dragging** while a gesture runs. The **layout** of a group maps `panelId` to size, a
   percentage from 0 to 100, summing to 100. The words never swap meaning, in code, docs or keys.
3. **Declarative primitives over a model (D3).** Panels are declared in the markup
   (`<Splitter.Panel id minSize maxSize collapsible …>`) and register in the model through
   commands, so middleware sees every change. The model holds every group's panels, their
   constraints, their sizes and their collapsed state. The outermost `Splitter.Group` creates the
   model unless one is passed; a nested group joins its parent's model, so one
   `model.get("splitter-json")` saves the whole layout. No Provider is required. Panel order comes
   from document position, never from mount order.
4. **JSON document (D4).** `{ version: 1, … }` holds what the user changed: each group's layout by
   explicit id, the collapsed state, and the size a panel returns to on expand.
   `createSplitterModel(json)` restores it; declared panels without a saved entry take their
   `defaultSize`. A round trip is stable. Constraints come from the markup and are not part of the
   saved document. `validateSplitter(json)` returns the issues; loading invalid JSON throws a
   `SplitterValidationError` with `issues` (each with its JSON path).
5. **Units (D5).** `minSize`, `maxSize`, `defaultSize`, `collapsedSize` and `collapsedThreshold`
   accept `%`, `px`, `em`, `rem`, `vh` and `vw`, with React Resizable Panels' interpretation of bare
   numbers and strings. The model stores sizes in `%` and constraints as declared. The engine
   reports each group's measured axis size and font sizes through a transient command, kept out of
   the JSON, so the model's rules resolve every unit without a DOM and `can` / `check` answer
   correctly.
6. **Geometry (D6).** Panels are CSS flex items whose grow factor equals their size, written as
   structural inline style from the first render, so server rendering does not shift the layout.
   The only inline style is structural: flex sizing, `overflow: hidden` on panels, nothing
   cosmetic. Group resize behaviour: `preserve-relative-size` (the default) or
   `preserve-pixel-size`.
7. **State (D7).** State is exposed only through `data-*` and ARIA: `data-orientation`,
   `data-collapsed`, `data-collapsible`, `data-disabled`, `data-dragging`, and
   `data-splitter-part` (`group` | `panel` | `separator`). Every element also has a path attribute,
   `data-splitter-path` (`/g0/p1`, `/g0/s0`). A boolean `data-*` is present or absent, never
   `"false"`. (The part attribute follows the ecosystem's open proposal, `data-<slug>-part`.)
8. **Interaction (D8).** Pointer Events with pointer capture, through the root's
   `ownerDocument`/`defaultView`: one path for mouse, touch and pen; no HTML5 drag and drop and no
   drag or resize library. A drag runs `{ transient: true }` steps, then one final commit that
   middleware can veto (a veto leaves the layout unchanged). The keyboard follows the WAI-ARIA APG
   **Window Splitter**: the separator has `role="separator"`, `aria-orientation`,
   `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-controls`; the arrows resize, Home
   and End move to the limits, Enter toggles collapse. A double click resets the layout; disabling
   it is an option.
9. **RTL (D9).** A horizontal group follows the inline direction (`dir`). Sides are logical, and
   RTL is a mirror, not a fork.
10. **Accessible names (D10).** Primitives render only their children and set no `aria-label`.
    Every name comes from the consumer. The docs have an accessible-names page.
11. **The core rules** (guidelines `architecture/core-and-adapters.md`, enforced by
    `packages/core/tests/guard.test.ts` once the core lands): the core never imports `react`,
    `react-dom` or any framework type; it has **zero runtime dependencies**; it never touches
    global `document`, `window`, `requestAnimationFrame`, `ResizeObserver` or `crypto` (all DOM
    access goes through the root's `ownerDocument`/`defaultView`; ids come from an injectable
    `createId`); **no `any`** in exported declarations (the guard test and `scripts/check-dts.ts`);
    no CSS class names. Layout rules are pure functions; **inputs are never mutated**.
12. **The model API** (guidelines `architecture/model-api.md`, Dockable's catalogue). The model
    and the engine expose exactly the five verbs `run(key, payload, options?)`, `can`, `check`,
    `get`, `is`, plus `use`, `subscribe` and `dispatch`; a new read or question is a new key, never
    a new method. State is plain, immutable, frozen JSON-shaped data; only `model.run` changes it.
    Commands never throw on bad input: they return `{ ok: true, value } | { ok: false, error }`.
    Every command is declared with `defineCommand` and JSON Schemas for its payload and result;
    `model.get("commands")` lists them, `dispatch` validates untrusted JSON, `batch` is one atomic
    step, and `site/docs/api/commands.mdx` is generated from the registry (`pnpm check` fails on
    drift). Everything only an adapter calls is under `engine.adapter`.
13. **Model API naming.** Keys are kebab-case and typed by a registry; a key and its payload read
    as one sentence. A command name has a dot, `<entity>.<verb>` (`panel.resize`,
    `group.set-layout`); an engine action never has one (`measure`, `focus-separator`). A field
    holding an id is `<entity>Id` (`panelId`, `groupId`, `separatorId`), except an entity's own
    `id`. A `get` key names its result and ends in `-by` when it takes an id (`panel-by { id }`,
    `layout-by { groupId }`); one that takes nothing has a plain name (`groups`, `splitter-json`).
    An `is` key is the question after "is": `<entity>-<state>` (`panel-collapsed { panelId }`).
14. **The primitive contract** (guidelines `components/primitives.md`, Dockable's). One namespace
    (`Splitter.Group`, `Splitter.Panel`, `Splitter.Separator`), hooks exported as the lower layer;
    `render`, never `asChild`; `ref` a plain prop, merged with the primitive's own; arbitrary props
    forwarded, handlers internal first then the consumer's; `className` and `style` a value or a
    `(state) => value` function, consumer style merged under the structural style; **inline style
    structural only**; state only through `data-*` and ARIA (D7); **no text and no names** (D10).
    The adapter renders and wires; it never re-implements a rule the core has: a decision it needs
    is a new core key.
15. **App policy stays in the app.** Persistence, undo/redo, translations, cursors and any
    cosmetic style belong to the examples (copyable code and CSS), never to a package.
16. **Versions and tooling.** pnpm 11, Node ≥ 24, TypeScript 7, tsdown, Vitest 5, Biome 2.5,
    Vite 8, Playwright (Chromium), React 19. Pin dependencies to exact versions published at least
    7 days ago (`npm view <pkg> time --json`). The workspace packages resolve to their sources
    through the `@fragiola/source` export condition (`scripts/source-condition.ts`, the tsconfig's
    `customConditions`, the Vitest configs); the published `exports` are `publishConfig.exports`,
    dist only. Packed and published only with pnpm, and only through the release workflow.

## Commands

| command | does |
|---|---|
| `pnpm install` | install dependencies (CI: `--frozen-lockfile`) |
| `pnpm check` | Biome lint + format + assist (non-mutating), then `check:layout` |
| `pnpm check:layout` | the source layout check (`scripts/check-layout.ts`, from Dockable): every tracked name kebab-case, a package's `src/` root holds only its entries |
| `pnpm check:fix` | Biome check with auto-fix |
| `pnpm typecheck` | `pnpm -r typecheck` (TypeScript 7, no emit) |
| `pnpm test` | Vitest across the projects that exist: `core` (node), `react` (jsdom), `site` |
| `pnpm build` | `pnpm -r build` (tsdown for the packages), then the `.d.ts` check (`scripts/check-dts.ts`) |

Coming with the later Issues of Epic #7: `pnpm e2e` (Playwright: the playground and the examples
app), `pnpm dev` (the playground), `pnpm site:export --base /splitter --out <dir>` and
`pnpm site:dev --base /splitter --port 5184` (contract v1.2, `../www/CONTRACT.md`),
`pnpm check:package`, `pnpm changeset` / `release:version`, and the generated-commands drift check
in `pnpm check`.

## Repository layout

```
packages/core/      @fragiola/splitter        src/<domain>/ (state, commands, schema, layout, units, engine, keyboard), tests/ mirroring it, tests/types/
packages/react/     @fragiola/splitter-react  src/components/, hooks/, utils/; entries index.ts, parts.ts, context.ts
apps/playground/    (coming)                  the dev app: scenarios, unstyled fixtures for Playwright
examples/shared/    (coming)                  every example's metadata, themes, embed protocol, manifest builder, the Playwright specs
examples/react/     (coming)                  the site's React examples, vendored Fragiola UI
site/               tests/                    the repository checks' tests; later docs/, export.ts, contract.ts, dev.ts
scripts/                                      check-layout.ts, check-dts.ts, source-condition.ts
.github/workflows/  ci.yml                    check, typecheck, test, build on pull requests and pushes to main
```

## Provenance: React Resizable Panels

`../references/react-resizable-panels` (v4.18.0, MIT) is the **behaviour reference only**: read it,
never modify it, never copy it. Only its flex groups (`Group`, `Panel`, `Separator`) are in scope;
its Grid, its Workspace (Dockable covers tabsets), separator previews and invisible extended hit
targets are not. What Splitter takes from it is behaviour (constraints, units, collapse thresholds,
the restore size on expand, group resize behaviour, normalization), checked by tests against it.
The model, the commands, the engine and the primitives are Fragiola's own. A file whose algorithm
is nonetheless derived from it starts with a header naming the project, the upstream file, the
copyright line and the MIT licence, and the guard test lists it.

## Conventions

- Biome: 4-space indent, double quotes, LF, trailing newline, organized imports.
- TypeScript strict with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. Do not relax it;
  a blanket `!` on every index access is not a fix.
- Code, docs and commit messages in English.
- Commits are gitmoji-conventional: `✨ feat(core): …`, `🐛 fix(react): …`, `✅ test(core): …`,
  `🔧 chore: …`, `👷 ci: …`, `📝 docs: …`. One coherent change per commit.
- Branches: `<type>/epic-<n>-<short-description>`; one worktree per Epic under `.worktrees/`.
- **Source layout** (guidelines `repository.md#source-layout`, enforced by `pnpm check:layout`):
  every file and folder name is kebab-case (the kebab-case of its main export:
  `useSplitterRef` → `use-splitter-ref.ts`); a `src/` is never flat: its root holds only the
  entries (`index.ts`, `parts.ts`, `context.ts`), everything else lives in a folder named after
  what it holds. One public component, hook or function per file, with its types beside it; hooks
  only the primitives call live in `hooks/internal.ts`. No barrel files inside the folders. A
  reorganization is its own change.
- Unit tests live in each package's `tests/`, mirroring `src/` in the core; type fixtures in
  `tests/types/` (`@ts-expect-error` marks what must not compile).
- Every rule a reviewer would otherwise have to remember is a test.
- Every PR that changes what a package ships carries a changeset (once Changesets lands).

## Decisions taken during implementation

- **Issue #1:** tool versions are grid-layout's pins (pnpm 11.23.0, TypeScript 7.0.2, Vitest
  5.0.2, Biome 2.5.14, tsdown 0.23.0, Vite 8.3.1, jsdom 30.1.1, React 19.3.0, `@types/node`
  24.13.6), unchanged. The root Vitest config lists `apps/*` (not `apps/playground`) so it runs
  before the playground exists. The React package re-exports the core from day one
  (`export * from "@fragiola/splitter"`), which exercises the source condition and the build.
