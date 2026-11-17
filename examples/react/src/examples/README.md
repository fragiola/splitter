# Examples

Each folder is one example of the site's gallery (`fragiola.com/splitter/examples/<folder>`),
rendered alone by this app at `index.html?id=<folder>`.

```
src/examples/
  <slug>/index.tsx     the example (default export, "use client")
  <slug>/styles.ts     how it looks: one class string (or function) per part
  <slug>/*.ts(x)       optional sibling files, shown in the code panel
  _kit/                copyable app policy (persistence.ts, undo.ts); no Splitter assembly, no styles
```

What every framework's examples share and no reader copies lives once in `examples/shared`
(`examples-shared`, imports no framework): each example's metadata (`src/meta/<slug>.ts`: title,
description, category, order, features, docs link, layout, height), the themes (`src/themes/`: one
CSS file each, values only, and their list), the embed message protocol, the manifest builder and
the loader generator (`scripts/`, parameterized by framework), and every Playwright spec (`e2e/`).
An example keeps its id in every framework: the Vue and Angular apps (`examples/vue`,
`examples/angular`) add a folder of the same name, and the same specs run against them.

## Categories

The gallery groups examples by the feature they show (`CATEGORIES` in
`examples/shared/src/meta-types.ts`, in sidebar order; the site export contract calls a category a
`level`). An example belongs where a reader looking for its feature would search, and `order` is
its place inside the category.

| category | what belongs in it |
|---|---|
| `getting-started` | the first groups: side by side, stacked |
| `layouts` | how groups are put together: nesting, panels that come and go |
| `constraints` | what limits a panel: minimum and maximum sizes in any unit, pixel-sized panels, disabled panels and separators |
| `collapsing` | panels that collapse and expand: by drag, by key, from code |
| `keyboard` | the Window Splitter keys and the ARIA values |
| `styling` | how a splitter looks when it is not about one feature: separators, state attributes, right to left |
| `model-api` | the model driven by the app: commands from outside, saving and restoring, undo |
| `apps` | several features together, as an app would put them |

## Adding an example

1. Create `src/examples/<slug>/index.tsx` and `styles.ts`, and its metadata in
   `examples/shared/src/meta/<slug>.ts` (see `examples/shared/src/meta-types.ts`).
2. `pnpm dev` at the root lists it in the playground (`apps/playground`), with hot reload, the
   themes and its source: `http://localhost:5173/?example=<slug>`. The embed alone is
   `pnpm --filter examples-react dev` (`http://localhost:5184/?id=<slug>`, `PORT` moves it; it
   regenerates the loaders).
3. The smoke e2e visits it in every theme and inside an iframe. Add a spec for its main behaviour
   in `examples/shared/e2e/examples/<slug>.spec.ts`: every framework runs it, through
   `data-splitter-path`, `data-splitter-part`, roles, accessible names and test ids only, and
   skips it while that framework lacks the example.

## Anatomy of an example

A reader opens `index.tsx` and sees the logic first: what is rendered, how the splitter is
assembled, which API is called. How it looks is one click away, in `styles.ts`.

- **`index.tsx` renders `<Splitter.Group>`** and the panels and separators under it, in the same
  file or in sibling files of the same folder, never in a shared module: `_kit/` holds no Splitter
  assembly (`tests/examples.test.ts`).
- **Classes in `styles.ts`**, beside `index.tsx`. It exports one `const` per styled part, named
  after the part (`group`, `panel`, `separator`, …): a class string, built with `cn()` when it is
  long, or a function of an app value. The `.tsx` files `import * as styles from "./styles"` and
  write `className={styles.separator}`. No `.tsx` file of an example holds a class string or calls
  `cn()` (`tests/examples.test.ts`).
- **State through `data-*`**: the package's state is styled with data variants
  (`data-dragging:`, `data-[orientation=vertical]:cursor-col-resize`, `in-data-collapsed:hidden`,
  `not-data-disabled:hover:`), never a function of the part's state: the markup stays the same in
  every framework, and the cursor and the hover colours come from the attributes.
- **Classes are complete literals.** Tailwind finds a class by reading the source, so
  `` `palette-${tone}` `` is never generated: map a value to a full class instead.
- **Accessible names inline**: every separator's `aria-label` (the package renders none), every
  region's, every icon button's.
- **Tokens, not values that differ per theme**: fonts, padding, corners, the separators' hit size,
  line and colours, and the focus ring read the `--sp-*` tokens each theme declares (listed in
  `examples/shared/src/themes/<name>.css`). Sizes and constraints are the panels' own props, never
  tokens.

## Rules

- **Copyable imports only**: `react`, `@fragiola/splitter-react` (it re-exports the core),
  `lucide-react`, Fragiola UI (`#/components/ui/*`, `#/components/atoms/*`, `#/lib/cn`), and
  relative files inside `src/examples/`. `#/` is the app's `src/`; `@name` is reserved for
  packages (site export contract, §6), so `@/` is never used. `tests/examples.test.ts` enforces it.
- **Theme-agnostic**: style through palette roles (`bg-palette-base`, …) and the theme tokens
  (`--sp-*`), never fixed colours, so the example works in every theme.
- **App policy stays in the app**: persistence, undo and redo, cursors and every cosmetic style
  live in the example or in `_kit/`, never in a package.
- **Fragiola UI is vendored** by `scripts/vendor-fragiola.ts` (`pnpm --filter examples-react
  vendor`, `FRAGIOLA_REGISTRY` points it at another registry) and committed; the build never
  fetches.
