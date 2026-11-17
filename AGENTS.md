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

Private, never published: `apps/playground` (the dev app: the examples in place, scenarios,
unstyled fixtures for Playwright), `examples/shared` (`examples-shared`: what every framework's
examples share, framework-free) and `examples/react` (`examples-react`: the site's React examples
and their embed) and `site` (the export for fragiola.com/splitter: the pages, the export and dev
scripts, the contract and the repository checks' tests).

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
| `pnpm check` | Biome lint + format + assist (non-mutating), then `check:layout` and `check:commands` |
| `pnpm check:layout` | the source layout check (`scripts/check-layout.ts`, from Dockable): every tracked name kebab-case, a package's `src/` root holds only its entries |
| `pnpm check:commands` | builds the core and fails when `site/docs/api/commands.mdx` differs from the registry (`packages/core/scripts/generate-command-docs.ts`; `pnpm --filter @fragiola/splitter generate:commands` rewrites it) |
| `pnpm check:fix` | Biome check with auto-fix |
| `pnpm typecheck` | `pnpm -r typecheck` (TypeScript 7, no emit) |
| `pnpm test` | Vitest across the projects: `core` (node), `react` (jsdom), `playground`, `examples-shared`, `examples-react`, `site` |
| `pnpm build` | `pnpm -r build` (tsdown for the packages, Vite for the playground and the embed), then the `.d.ts` check (`scripts/check-dts.ts`) |
| `pnpm e2e` | Playwright, one app after the other: the playground (Chromium and Firefox, its dev server on 5173, `PLAYGROUND_PORT` moves it), then each examples app's shared suite (`examples/shared/e2e`) against a production build of its embed (on 4340 + the framework's index, `EXAMPLES_E2E_PORT` moves it). The examples suite builds against the packages' `dist`: run `pnpm build` first. `pnpm exec playwright install chromium firefox` once |
| `pnpm dev` | the playground on 5173 (`PLAYGROUND_PORT`): every example with its themes and source, the scenarios, the fixtures. The embed alone: `pnpm --filter examples-react dev` on 5184 (`PORT`) |
| `pnpm site:export --base /splitter --out <dir>` | the site export, contract v1.2 (`../www/CONTRACT.md`): builds the packages and the React embed for `<base>/embed/react/`, writes `project.json`, `docs/`, `examples.json` and each embed's `manifest.json`, then validates the output (`site/contract.ts`) and exits non-zero on any problem. It only replaces a previous export |
| `pnpm site:dev --base /splitter --port 5184` | every framework's embed with hot reload behind one Node proxy (`site/dev-proxy.ts`, no dependency) under `<base>/embed/<framework>/`, for `www` in dev (`devUrl` `http://localhost:5184`) |
| `pnpm --filter examples-react vendor` | vendors Fragiola UI into `examples/react/src` (`scripts/vendor-fragiola.ts`; `FRAGIOLA_REGISTRY` points it at a registry URL or a local `public/r` directory); the copies are committed |

| `pnpm check:package` | builds the packages, packs each with pnpm and checks the tarballs (`scripts/check-package.ts`, from Dockable): the packed `exports` are the repo's without the source condition (`types`/`import`/`default`, `dist` targets), publint (strict), attw (`esm-only`), each adapter of `ADAPTERS` pins the core exactly, and its smoke app (React: Vite + React, outside the workspace, the React tarball only) typechecks, builds and loads its dev server. `--tarballs <dir>` checks given tarballs (the release workflow's) |
| `pnpm changeset` / `release:version` | Changesets: add a changeset / bump the versions (the release workflow runs the latter); core and adapters are one `fixed` group (`@fragiola/*`). Releasing: `docs/releasing.md` |

## Repository layout

```
packages/core/      @fragiola/splitter        src/<domain>/ (state, commands, schema, layout, units, engine, keyboard), tests/ mirroring it, tests/types/
packages/react/     @fragiola/splitter-react  src/components/, hooks/, utils/; entries index.ts, parts.ts, context.ts
apps/playground/    playground                src/shell/ (catalog, stage, source), src/scenarios/<area>/<id>.tsx (dev-only), src/fixture/ + fixtures/<name>/index.html (unstyled, for Playwright), e2e/, tests/
examples/shared/    examples-shared           src/meta/<slug>.ts, src/themes/, src/embed/, src/framework.ts, scripts/ (examples-lib, generate, manifest), e2e/ (every spec, every framework), tests/
examples/react/     examples-react            src/examples/<slug>/ (index.tsx, styles.ts), src/examples/_kit/ (persistence.ts, undo.ts), src/embed/, vendored Fragiola UI (src/components, lib, styles), scripts/vendor-fragiola.ts, tests/
site/               export.ts, dev.ts, dev-proxy.ts, sources.ts, contract.ts, project.json; docs/ (config.json, index.mdx, getting-started/, concepts/, guides/, api/, limitations.mdx); tests/ (contract, docs-reference, dev-proxy, the repository checks)
site/docs/api/      commands.mdx              generated from the command registry (do not edit)
docs/               docs-examples-gaps.md     what the docs and examples work around, with the proposed API; releasing.md (the release runbook)
scripts/                                      check-layout.ts, check-dts.ts, check-package.ts, source-condition.ts
.changeset/         config.json               one fixed group @fragiola/*, changedFilePatterns; the pending changesets
.github/workflows/  ci.yml                    check, typecheck, test, build; package; changesets; the playground's e2e; one e2e job per examples app; site export; the www trigger
                    release.yml               Version Packages PR, then pack, check --tarballs and publish over OIDC from the `npm` environment
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
- Every PR that changes what a package ships carries a changeset (`pnpm changeset`; CI's Changesets job fails without one).

## Decisions taken during implementation

- **Issue #1:** tool versions are grid-layout's pins (pnpm 11.23.0, TypeScript 7.0.2, Vitest
  5.0.2, Biome 2.5.14, tsdown 0.23.0, Vite 8.3.1, jsdom 30.1.1, React 19.3.0, `@types/node`
  24.13.6), unchanged. The root Vitest config lists `apps/*` (not `apps/playground`) so it runs
  before the playground exists. The React package re-exports the core from day one
  (`export * from "@fragiola/splitter"`), which exercises the source condition and the build.
- **Issue #2 (core):**
  - **Surface.** `createSplitterModel<Types>(json?, { createId? })`, `createSplitterEngine(model,
    { keyboardStep?, resetOnDoubleClick? })`, `validateSplitter`, `SplitterValidationError`, `veto`,
    the pure rules (`adjustLayoutByDelta`, `validateLayout`, `defaultLayout`, `normalizeLayout`,
    `resizePanel`, `preservePixelSizes`, `separatorValues`, `validatePanelSize`,
    `resolveConstraints`), the units (`parseSize`, `sizeToPercentage`, `sizeToPixels`) and
    `separatorKeyIntent`. The model has no `state` property (unlike Dockable): the state is
    `model.get("state")`, so the surface is exactly the eight verbs.
  - **Types registry** is ids only: `SplitterTypes { groupId; panelId }` narrows every id field of
    payloads and keys. Panels carry no app data.
  - **Commands:** `group.add|update|remove|set-layout|reset|measure`,
    `panel.add|update|remove|resize|collapse|expand`, `separator.move|update`, `batch`. Transient-capable:
    `group.set-layout`, `group.measure`, `panel.resize`, `separator.move`, `batch`.
    `group.update`, `panel.update` and `separator.update` exist because markup props change.
  - **Separators are derived**, never registered: one between each pair of neighbouring panels,
    id `` `${beforePanelId}:${afterPanelId}` `` (a lookup tries every colon, so ids may hold one).
    What a separator's markup declares (`disabled`, `resetOnDoubleClick`) is stored on its group by
    `separator.update` and forgotten when the separator disappears.
  - **Order:** `panel.add { order }` (default: after the others); panels sort by `order`, ties keep
    registration order. `engine.adapter.syncOrder(groupId)` sorts the bound panel elements by
    `compareDocumentPosition` and runs one batch of `panel.update { order }`.
  - **Registration needs the group first:** `panel.add` on a missing group is `not_found`. An adapter
    registers a group and its panels in one `batch` (effects run child first). `parentPanelId` is
    recorded but not checked, and `group.remove` does not cascade to nested groups.
  - **Layout on structural change** (panel added or removed): the saved layout once the group
    holds exactly the saved panels, else the layout the group last had with the new panel set
    (`layoutMemory`, see the S1 decision), else the default layout of the new set. A group remembers whether its layout is still the default
    (`pristine`); a pristine layout is derived again when constraints or the measure change.
  - **Document v1:** `{ version: 1, groups: [{ id, panels: [{ id, size, collapsed?, restoreSize? }] }] }`,
    ids required (they must match the markup, so none is generated at load). A loaded group is
    pending until its panels register; `splitter-json` writes registered groups, then pending ones
    as loaded (stable round trip). A collapsed saved panel comes back at its current collapsed size.
    `__proto__` is refused as an id.
  - **Units:** a percentage resolves with no measure; px, em, rem, vh and vw need `group.measure`
    (axis size = sum of the panels' layout sizes, the group's font size for `em`, the root's for
    `rem`, the viewport). Until then they count as absent (min 0, max 100, no default) and
    `panel.resize` with such a size is `refused`. `em` uses the group's font size, not the panel's.
  - **Disabled:** a disabled panel never moves through `separator.move`; code (`panel.resize`,
    `panel.collapse`/`expand`, `group.set-layout`) may resize it, as RRP's imperative API does. A
    disabled separator or group makes `separator.move` `refused`.
  - **Collapse:** `panel.collapse` / `panel.expand` are `refused` on a non-collapsible panel and
    when the other panels cannot make room; the restore size is recorded whenever a change
    collapses a panel, and expanding falls back to the minimum (1% when it is 0).
  - **Engine:** one engine binds any number of groups of a model. A drag sends
    `separator.move { delta, origin, source: "pointer" }` transient steps measured from the drag's
    start, then one non-transient move (none for a click without movement); when that commit is
    refused, a transient `group.set-layout` with `meta.restore` puts the origin back.
    `pointercancel` / `lostpointercapture` commit the last step, as RRP does. Keyboard step 5% by
    default; only handled keys are `preventDefault`ed; Enter runs `panel.collapse` / `panel.expand`
    on the panel before the separator; F6 cycles focus. A double click resizes the panel before the
    separator (else after) that declares a `defaultSize` back to it. The engine writes nothing to
    the DOM besides pointer capture and focus; ARIA comes from `engine.get("separator-aria-by")`
    (`aria-orientation` is across the group's). `engine.use` / `subscribe` / `dispatch` wrap the
    engine actions (`measure`, `focus-separator`) and its view events.
  - **Provenance:** the layout files listed in the guard test, and three test files ported from
    RRP's own tests (`adjustLayoutByDelta`, `validateAxisLayout`, `getImperativeItemMethods`), carry
    RRP's MIT header; the root and package `LICENSE` files carry its notice.
  - The core's tsconfig loads `@types/node` (for the tests and the generator); the guard test fails
    on any Node-only API in `src/`.
- **Issue #3 (React adapter):**
  - **Surface.** `Splitter.Group` (`id`, `orientation`, `disabled`, `model`, `layout`,
    `defaultLayout`, `onLayoutChange`, `onLayoutCommit`, `splitterRef`, and, read once by a root
    group, `keyboardStep` and `resetOnDoubleClick`), `Splitter.Panel` (`id`, the eight constraints,
    `onResize(size, previous)`, `onCollapse`, `onExpand`), `Splitter.Separator` (`disabled`,
    `resetOnDoubleClick`); hooks `useSplitter()` / `useSplitter(splitterRef)`, `useGroup()`,
    `usePanel(options)`, `useSeparator(options)`, `useSplitterRef()`. Part states are
    `GroupPartState`, `PanelPartState`, `SeparatorPartState` (the core already exports
    `GroupState`, `PanelState`, `SeparatorState`). `useGroup()` reads the enclosing group (the
    group's registration needs its context, so it lives in `Splitter.Group`); `usePanel` and
    `useSeparator` register their part.
  - **Core keys added for the adapter:** `engine.adapter.syncSeparators(groupId, elements)` (the
    n-th separator element of a group in document order is its n-th separator: the markup does not
    say which panels a separator sits between); `group.remove { keepLayout }` (a layout the user
    changed becomes a saved group until the group registers again, so a StrictMode double mount or
    a remount keeps it; it stays in `splitter-json`); `group-path-by`, `panel-path-by`,
    `separator-path-by`; `createSplitterRef` / `attachSplitterRef` in the core, as Grid Layout's
    ref. The engine listens to the model only while a group is bound, so creating one has no side
    effect and React may create it during render; React never calls `destroy`, it unbinds.
  - **Paths:** `/g<n>` for the n-th root group of a model, `<panel path>/g<n>` for a group nested in
    a panel, `<group>/p<index>` and `<group>/s<index>` by model order; n counts registration order
    (document order at mount). A part has no path (nor a separator its ARIA values) until it
    registers, which happens before the first paint; the server HTML has none.
  - **Registration:** panels register in their layout effects; while their group is not registered
    (React runs child effects first) they wait in the group's registry, and the group runs one
    `batch` (`group.add`, the waiting `panel.add`s, and `group.set-layout` for `layout`, else
    `defaultLayout` when the model has no saved layout for the group, only when `model.can` accepts
    it). Then `syncOrder` and `syncSeparators`. A second group with a taken id is reported in the
    console and does not register. Unmount undoes every step (React tears a parent down before its
    children, so `group.remove` takes the panels with it).
  - **Controlled layout:** `layout` is applied when the group registers and whenever its values
    change to other than the model's layout (a prop fed back by `onLayoutChange` runs nothing, so
    drag steps stay transient and a veto's restore holds); the adapter does not snap the model back when the parent ignores `onLayoutChange`
    (that would fight a drag mid-gesture). A middleware vetoes changes the app refuses.
    `onLayoutChange` fires on every commit that changes the layout (drag steps and the registration
    included), `onLayoutCommit` on every non-transient commit that leaves a layout other than the
    last one committed.
  - **Structural style:** group `display: flex`, `flex-direction`, `flex-wrap: nowrap`; panel
    `flex: <size> 1 0`, `overflow: hidden`; separator `flex-grow: 0`, `flex-shrink: 0`,
    `touch-action: none` (pointer drags on touch screens need it). Before a panel's size is known
    (no `layout`, `defaultLayout` or saved layout), it renders `flex: 0 1 <defaultSize>` when it
    declares one, else `flex: 1 1 0`, the same on the server and in the hydration render.
  - **Ids:** default ids come from `useId`. A panel's DOM `id` is its panel id (the separators'
    `aria-controls` points at it). A separator's `data-orientation` is its own (`aria-orientation`),
    as Dockable's splitter.
- **Issue #4 (examples and playground):**
  - **Imitated** grid-layout's `examples/shared`, `examples/react` and `apps/playground` (its
    cleanest copies of Dockable's), plus Dockable's scenarios (`src/scenarios/<area>/<id>.tsx`, areas
    `layout` and `api`). Copied files keep a "From Grid Layout / From Dockable" header.
  - **Frameworks:** `examples/shared/src/framework.ts` lists react, vue and angular with their entry
    files, adapter packages and icon packages; `COMPLETE_FRAMEWORKS` (`e2e/available.ts`) is
    `["react"]` only, so a Vue or Angular app may ship a subset while it is written (a spec for an
    example it lacks is skipped); each joins the list when it has every example.
  - **Examples (15):** `basic-horizontal`, `vertical` (getting started); `nested-groups`,
    `conditional-panels` (layouts); `size-constraints`, `fixed-size-panels`, `disabled-panels`
    (constraints); `collapsible-sidebar` (collapsing); `keyboard`; `rtl-layout`,
    `styling-showcase` (styling); `controlled-from-code`, `persistent-layout`, `undo-redo`
    (model API); `ide-layout` (apps). The categories are `CATEGORIES` in `meta-types.ts`. Their
    `docs` links name the pages Issue #5 writes; the site export's link check settles them.
  - **Themes:** two, `light` and `dark` (the minimum), with grid-layout's palette values and the
    splitter tokens `--sp-font`, `--sp-font-size`, `--sp-panel-padding`, `--sp-radius`,
    `--sp-border`, `--sp-shadow`, `--sp-separator-size`, `--sp-separator-line`, `--sp-focus-width`,
    `--sp-title-weight`, `--sp-motion`, and per palette `--sp-canvas-bg`, `--sp-panel-line`,
    `--sp-separator-color`, `--sp-separator-hover`, `--sp-separator-active`, `--sp-focus-line`
    (`tests/themes.test.ts` holds the list).
  - **Styling rules enforced by `examples/react/tests/examples.test.ts`:** no class string or
    `cn()` in a `.tsx`, `#/` and the listed packages only (`@/` refused), no fixed colour in a
    `styles.ts`, and every resize cursor behind a `data-` variant. State is styled with data
    variants only (`data-dragging:`, `in-data-collapsed:`, `not-data-disabled:hover:`), never a
    `className` function of the part state, so the markup ports to Vue and Angular unchanged.
  - **Specs reach the examples through** `data-splitter-path`, `data-splitter-part`, roles,
    accessible names and test ids. `openExample` waits for `/g0` (a part has a path once it
    registered). Every example has a smoke spec in both themes, an iframe spec (`host.html`, ready
    once) and a dedicated spec in `e2e/examples/<slug>.spec.ts`.
  - **Kit:** `_kit/persistence.ts` (guarded `localStorage` load/save/forget) and `_kit/undo.ts`
    (a history over `model.subscribe`: a whole drag is one step, measured from the last committed
    layouts; what carries `meta.source: "adapter"` is not a step; undo and redo run one `batch` of
    `group.set-layout`). The kit describes the model structurally and never imports the package.
    `persistent-layout` validates the saved document with `validateSplitter` before
    `createSplitterModel(json)`, so a corrupt entry falls back to the defaults.
  - **Fragiola UI** vendored from the local `../ui` checkout (d859caa), its registry built with
    `packages/registry/scripts/build-registry.ts --out <tmp>` and passed as `FRAGIOLA_REGISTRY`;
    the headers name `https://fragiola.com/r/<item>.json`, the same as grid-layout's copies
    (`clickable` is byte-identical). Items: theme, eight palettes, badge, clickable, switch, text
    (with their dependencies cn, choice, field).
  - **Ports and versions:** examples dev 5184 (`PORT`), playground 5173 (`PLAYGROUND_PORT`), the
    examples e2e server 4340 (grid-layout uses 4320: both can run at once). Playwright 1.63.0,
    Tailwind 4.3.3, `@vitejs/plugin-react` 6.1.1, `@base-ui/react` 1.8.0, `lucide-react` 1.48.0,
    `tw-animate-css` 1.4.0, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tailwind-variants` 3.3.1:
    grid-layout's pins. The examples' Playwright project is Chromium only (no touch examples);
    the playground runs Chromium and Firefox.
  - **Fixtures:** one unstyled page, `fixtures/basic` (ltr) and `fixtures/rtl`, configured by the
    query (`orientation=vertical`, `veto=1` for a vetoing middleware), 600px of panels so 1% is
    6px. Its specs cover drags (transient steps, one commit, veto puts the origin back),
    the keyboard in both directions, collapse thresholds, conditional order and the part
    contract. `site/tests/noindex.test.ts` checks every HTML page for `robots: noindex`.
- **Issue #5 (site export and documentation):**
  - **Imitated** grid-layout's `site/` (the newest copy of Dockable's): `contract.ts` byte for byte
    plus one check, `export.ts`, `sources.ts`, `dev.ts` (default port 5184), `dev-proxy.ts`, and
    the `contract` and `dev-proxy` tests; `docs-reference.test.ts` is Dockable's, rewritten for
    this package (it follows `extends` into the package's own interfaces, so `PanelProps` is
    checked through `UsePanelOptions`).
  - **Added check:** a page's title never contains the project's title ("Splitter"): `www`
    appends it (CONTRACT §3.6). So the part pages are titled `Group`, `Panel`, `Separator` (the
    sidebar labels them `Splitter.Group`, …), and the docs-reference test checks that title.
  - **`examples.json` is generated**, not committed: `sources.ts` builds it from
    `examples/shared` (`CATEGORIES` as the levels, `THEMES` with their CSS), as grid-layout and
    Dockable do, so the levels and themes can never drift from the examples.
  - **Pages (37 plus the landing):** Getting started (5), Concepts (8), Guides (13), API
    primitives (5: `group`, `panel`, `separator`, `hooks`, `external-ref`), API core (5: `model`,
    `command-bus`, `commands` (generated), `json-document`, `engine`), More (`limitations` and the
    external "Found a problem?" link). The common primitive props live on `api/group#common-props`.
    The landing's showcase is `ide-layout`.
  - **Example docs links** now name these pages (`/docs/getting-started/first-split-view`,
    `/docs/guides/collapsible-panels`, `/docs/guides/size-constraints`, …); `disabled-panels`
    links `/docs/guides/size-constraints#disabled-panels-and-separators`. `ide-layout` has none.
  - **Snippets** were type-checked once against the packages' sources (a scratch tsconfig over the
    extracted `ts`/`tsx` blocks); the testing guide's two Vitest snippets were run. There is no
    permanent snippet check: it would need a compiler run per test.
  - The export is not run inside `pnpm test` (it builds every package and the embed); its
    validation is the same `validateSite` the contract test runs on the sources.
  - `docs/docs-examples-gaps.md` lists the workarounds (S1 to S10) with a proposed API each.
- **Package gaps S1, S2, S6 and S8** (`docs/docs-examples-gaps.md`, *Closed gaps*):
  - **S1, layout memory.** `GroupState.layoutMemory` maps the JSON of a panel set's sorted ids
    (safe for any id) to the last layout the user gave the group with that set. It is written when
    the set changes, only for a non-pristine layout (a default one is derived again anyway), and
    read when the group enters a set it had: the remembered layout validated against the current
    constraints, not pristine. It lives in the state only, out of the JSON document (the document
    keeps one layout per group), and is lost with the group (`group.remove`, a remount): React
    Resizable Panels' memory is in-memory per mounted group too. No new key: it is a state field
    (`group-by`).
  - **S2, `useSplitterState(selector, { splitterRef?, isEqual? })`.** Dockable's `useModelState`
    shape over `useSyncExternalStore`: the selector gets `(splitter, state)` (`splitter` being what
    `useSplitter` returns), runs once per model state or new selector, and an `isEqual` answer keeps
    the previous one. With a `splitterRef` it answers `undefined` while no group holds the ref (the
    overloads type it `S | undefined`); without one it throws outside a group, as `useSplitter`. It
    follows the model only, not the engine's view state. The undo guide and example keep their
    history's own store: its steps are app state, not a model answer.
  - **S6, `dir` at runtime.** Each bound group has a `MutationObserver` from its element's
    `defaultView` on its `ownerDocument` (`attributeFilter: ["dir"]`, subtree), measuring the group
    again when a mutated element contains it (one observer per group, the smallest change; a `dir`
    inside its content is ignored). A direction set through CSS alone still needs
    `engine.run("measure", {})`, documented.
  - **S8, `meta: { source: "adapter" }`.** There was no core convention besides the engine's
    `meta.restore`, so the adapter's commands for the markup (registration batch, `panel.add` /
    `panel.remove`, `group.update`, `panel.update`, `separator.update`, a controlled `layout`'s
    `group.set-layout`, `group.remove`) and the engine's `syncOrder` batch carry it; the React
    constant is `utils/adapter-run.ts` (not exported). A controlled `layout` counts as the
    markup's, since undoing it would fight the prop. `_kit/undo.ts` dropped its list of layout
    commands and its `steps` option.
- **Release readiness (Issue #6):**
  - **Not published.** The maintainer's npm account is suspended: nothing was published, no `npm
    trust`, no `npm` environment, no secret. `docs/releasing.md` opens with a *Status* section and
    the steps 1 to 9 the maintainer takes when the account is back; the packages stay at `0.0.0`
    and the two pending changesets (`minor` each) make the first release `0.1.0`. One changeset
    per package (`.changeset/splitter-core.md`, `splitter-react.md`).
  - **Copies of Dockable's**, names changed: `.changeset/config.json` (its `changedFilePatterns`
    kept whole, `ng-package.json` and `scripts/publish-manifest.ts` included, so the Angular
    adapter needs no edit), `release.yml` (only the repository guard differs, plus a header note
    on why nothing publishes yet), the CI Changesets, Package and trigger jobs, and
    `scripts/check-package.ts` with React only in `ADAPTERS` (the Vue and Angular smoke apps come
    with their Epics from Dockable's) but the `publishConfig.directory` support kept for Angular.
    Its tests are `site/tests/check-package.test.ts`. `scripts/exported-names.ts` was not copied:
    nothing here uses it yet.
  - **What prevents a publish today:** the publish mode runs only after the Version Packages PR is
    merged; no npm token exists; npm accepts the OIDC token only once `npm trust` names
    `fragiola/splitter`, `release.yml` and `npm`. GitHub would create a missing `npm` environment
    on its first use without a branch rule, so the runbook creates it (step 3) before that PR is
    merged.
  - **CI.** This repository's CI keeps running the checks on a push to `main` too (Dockable's runs
    only the trigger there); the Package and Site export jobs follow the same rule. The Site export
    job, announced since Issue #4, landed here. The trigger's step is skipped, not failed, without
    `WWW_DISPATCH_TOKEN`.
  - **actionlint** is not installed: the workflows were reviewed against Dockable's (`diff`) and
    parsed as YAML.
  - **Tool versions** (7-day rule, 2026-11-16): `@changesets/cli` 3.0.3, `@changesets/changelog-github`
    1.0.1, `@arethetypeswrong/cli` 0.18.5 (Dockable's), `publint` 0.3.25 (2026-10-01).
  - **`useSeparator`** sends only the props that changed since it last sent them, and the default
    (`disabled: false`, `resetOnDoubleClick: true`) for one that went back to `undefined`; it used
    to send nothing when both were `undefined`, so a separator stayed disabled.
- **Review fixes (after Issue #6):**
  - **Controlled `layout`** fed back by `onLayoutChange` runs nothing when it equals the model's
    layout (see Issue #3, *Controlled layout*).
  - **A vetoed drag leaves the group as it was** (D8). A layout is `pristine` when the caller
    says so or when it equals the group's default layout (it used to stay pristine only while
    unchanged), so the engine's restore after a veto, still one transient `group.set-layout` of
    the origin, makes a default layout pristine again. Transient steps record no restore size:
    the `Draft` knows whether its command is transient, and a drag's commit (`separator.move`
    with `origin`) records it from the origin, so a panel a drag collapses comes back to its size
    when the drag started (it used to be the size at the step before the collapse; React
    Resizable Panels records none for a drag). Keeping `pristine` through transient steps was
    tried and dropped: the engine measures the group again mid-drag (the panels resize), and a
    pristine layout is derived again on a measure, which reset the drag.
