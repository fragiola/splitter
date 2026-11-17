# Splitter

Headless resizable panel groups for the web: split views whose panels the user resizes by
dragging a separator or with the keyboard, with nested groups, collapsible panels, size
constraints in any CSS unit, right-to-left and a saved JSON layout. It ships behaviour,
accessibility (the WAI-ARIA Window Splitter pattern) and composable primitives, and **no CSS, no
icons, no cursors and no text**: you style every part with `className`, `style` and the `data-*`
attributes it exposes. Part of [Fragiola](https://fragiola.com).

Every change is a named command with a JSON Schema (`model.run("panel.collapse", { panelId })`),
run through your middleware, and the group and panel ids are typed by your own registry
(`createSplitterModel<Types>()`): the same commands drive the layout from code, from a test or
from an AI assistant.

Documentation, guides and live examples: **<https://fragiola.com/splitter>**
([getting started](https://fragiola.com/splitter/docs/getting-started/introduction)).

> Not on npm yet: the first release (`0.1.0`) is ready and waits for the maintainer's steps in
> [docs/releasing.md](docs/releasing.md).

| package | what it is |
|---|---|
| [`@fragiola/splitter`](packages/core) | framework-free core: layout rules and units, typed model and commands, the JSON document, the engine |
| [`@fragiola/splitter-react`](packages/react) | composable React 19 primitives over the core, and the core re-exported: what a React app installs |
| [`@fragiola/splitter-vue`](packages/vue) | the same primitives and the hooks as composables for Vue 3.5, and the core re-exported: what a Vue app installs |

An Angular adapter (`@fragiola/splitter-angular`) is planned. Every example of the site exists in
React and in Vue (`examples/react`, `examples/vue`).

## Install

```sh
pnpm add @fragiola/splitter-react
```

`react` and `react-dom` **^19** are peer dependencies. The React package re-exports the whole
core, so everything is imported from it. ESM only.

## A first split view

```tsx
import {
    createSplitterModel,
    Splitter,
    type SplitterTypes,
} from "@fragiola/splitter-react";

// the ids of your groups and panels: every prop, payload and key that names one is checked
interface Types extends SplitterTypes {
    readonly groupId: "workbench";
    readonly panelId: "sidebar" | "content";
}

const model = createSplitterModel<Types>();

export function Workbench() {
    return (
        <Splitter.Group id="workbench" model={model} style={{ height: "100vh" }}>
            <Splitter.Panel<Types> id="sidebar" defaultSize="25%" minSize={160} collapsible>
                <nav aria-label="Sidebar">…</nav>
            </Splitter.Panel>
            <Splitter.Separator aria-label="Resize the sidebar" style={{ width: 4 }} />
            <Splitter.Panel<Types> id="content">
                <main>…</main>
            </Splitter.Panel>
        </Splitter.Group>
    );
}

// from anywhere: a button, a shortcut, a test, an AI tool call
model.run("panel.collapse", { panelId: "sidebar" });
```

The group is a flex row, each panel a flex item sized in percent, and each separator a focusable
`role="separator"` that drags, moves with the arrow keys and resets on a double click. Save the
layout with `model.get("splitter-json")` and restore it with `createSplitterModel(saved)`.

Behaviour reference: [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)
(MIT), studied only. See [LICENSE](LICENSE).

## Running it

Requires Node ≥ 24 and pnpm 11.

```sh
pnpm install
pnpm dev            # the playground on http://localhost:5173: every example live
pnpm check          # lint + format, source layout, the generated command reference
pnpm typecheck
pnpm test           # unit and component tests
pnpm build
pnpm check:package  # the packed packages: exports, publint, attw and a smoke app
pnpm e2e            # Playwright
```

Releasing: [docs/releasing.md](docs/releasing.md). Contributors and agents: read
[AGENTS.md](AGENTS.md) first.
