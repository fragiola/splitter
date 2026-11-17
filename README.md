# Splitter

Headless resizable panel groups for the web: split views that users resize by pointer or keyboard,
with nested groups, collapsible panels and zero imposed styling. Part of
[Fragiola](https://fragiola.com). Work in progress, not published yet.

| package | what it is |
|---|---|
| [`@fragiola/splitter`](packages/core) | framework-free core: layout rules, typed model and commands, the engine |
| [`@fragiola/splitter-react`](packages/react) | composable React 19 primitives over the core |

Its behaviour follows [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)
(MIT), a study reference only.

## Running it

Requires Node ≥ 24 and pnpm 11.

```sh
pnpm install
pnpm check      # lint + format + source layout
pnpm typecheck
pnpm test
pnpm build
```

Contributors and agents: read [AGENTS.md](AGENTS.md) first.
