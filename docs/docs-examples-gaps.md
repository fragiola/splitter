# Docs and examples gaps

Epic #7 wrote the site's documentation (`site/docs`) and fifteen examples (`examples/react`)
against the packages as they are. Everything the examples or the documentation work around is
listed here, as input for the next Epics, in the spirit of Dockable's report of the same name.
Each workaround is also commented in the example's code or explained on its docs page, since users
copy it. The public side of this list is the site's [Limitations](../site/docs/limitations.mdx)
page.

## 1. Package gaps (proposed API)

| # | needed by | needed | workaround | proposed API |
|---|---|---|---|---|
| S3 | every example's separator, guide *Styling with CSS* | A pointer target wider than the visible line, larger on coarse pointers (React Resizable Panels' `resizeTargetMinimumSize`, panel-edge targets, crossing separators of nested groups dragged together). | A 9px separator with a 1px line drawn by `::before`; `@media (pointer: coarse)` can widen it. | Out of scope for now (AGENTS.md, provenance). Revisit with an optional hit-area option on the engine. |
| S4 | every example's separator and group, guide *Styling with CSS* | Cursors (a separator's, and one that stays during a drag). The package sets none: a cursor is cosmetic. | `data-[orientation=…]:cursor-*-resize` on the separator, `data-disabled:cursor-not-allowed`; the guide adds a cursor on `[data-dragging]` groups. | None: by design (rule 15). |
| S5 | guide *Size constraints and units*, *Limitations* | `em` against the panel's own font size, as React Resizable Panels resolves it. The engine measures the group's font size. | The docs advise `rem`, or setting the font size on the group. | Measure each panel's font size when one of its constraints is in `em`. |
| S7 | `persistent-layout`, guide *Saving a layout* | One commit callback for the whole model. `onLayoutCommit` is per group, so nested groups each need it. | The example passes the same `persist` to both groups; the guide uses one `model.subscribe` skipping `event.transient`. | Document `model.subscribe` as the way (done), or an `onCommit` on the root group. |
| S8 | `undo-redo` | Tell a user step from registration. Mounting a group commits a `batch` of `group.add` / `panel.add` that changes layouts. | `_kit/undo.ts` records only a list of layout commands (`separator.move`, `panel.resize`, `panel.collapse`, `panel.expand`, `group.set-layout`, `group.reset`), measured from the last committed layouts. | A `meta: { source: "adapter" }` on the adapter's registration batches. |
| S9 | `undo-redo` | Skip a shortcut during a drag. | The example reads `engine.get("dragging-separator-id")` in its `keydown` listener. | None needed: the key exists. |
| S10 | `collapsible-sidebar`, guides *Accessible names*, *Collapsible panels* | Hide a collapsed panel's content from assistive technology. A collapsed panel stays in the document at its collapsed size. | `in-data-collapsed:hidden` on the content (labels, here). | None: the content is the app's; documented. |

## 2. Closed gaps

| # | closed by | API |
|---|---|---|
| S1 | the core: a group remembers a layout per panel set | `GroupState.layoutMemory` (by the JSON of the set's sorted panel ids, in the state, out of the JSON document): a set the group had before takes back the layout the user last gave it, clamped to the current constraints; a new set takes its default layout. `conditional-panels` shows it and its spec asserts it. |
| S2 | the React adapter | `useSplitterState(selector, { splitterRef?, isEqual? })`: an answer of the model (`get`, `is`, `can`), re-rendering only when it changes, from inside a group or through an external ref (`undefined` while none holds it). `collapsible-sidebar`, `ide-layout` and the *Collapsible panels* guide follow the collapsed state with it instead of `onCollapse` / `onExpand` copied into React state. The undo history keeps its own `model.subscribe`: its steps are the app's state, not an answer of the model. |
| S6 | the core engine | Each bound group watches `dir` on its element and its ancestors with its window's `MutationObserver` (as Dockable does) and reads its direction again; the *Right-to-left* guide no longer runs `engine.run("measure", {})`. A direction set through CSS alone still needs that measure. |

## 3. Documentation decisions

- The API reference is written by hand (TypeScript 7 ships no compiler API for
  `fumadocs-typescript`); `site/tests/docs-reference.test.ts` fails when an export, a prop, a
  state field, a key or a member drifts from the packages. `site/docs/api/commands.mdx` is
  generated from the registry and checked by `pnpm check`.
- Every `ts` and `tsx` snippet of the docs was type-checked against the packages' sources when it
  was written (two blocks are deliberately fragments of sibling elements).
