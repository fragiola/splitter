# @fragiola/splitter

The framework-free core of **Splitter**, headless resizable panel groups: the pure layout rules
and units, a typed model whose every change is a command (`run`, `can`, `check`, `get`, `is`),
the JSON v1 document with its JSON Schema, and the engine that binds a group to the DOM
(measurement, pointer drags, the Window Splitter keyboard, right-to-left, ARIA values). Zero
runtime dependencies, no CSS.

A React app installs [`@fragiola/splitter-react`](https://www.npmjs.com/package/@fragiola/splitter-react)
instead, which re-exports all of this. Install the core alone for Node, tests or another
framework:

```sh
pnpm add @fragiola/splitter
```

Documentation: **<https://fragiola.com/splitter>**. ESM only.
