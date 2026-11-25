# @fragiola/splitter

## 0.2.0

### Minor Changes

- [#39](https://github.com/fragiola/splitter/pull/39) [`cc0f99b`](https://github.com/fragiola/splitter/commit/cc0f99b36e03f37704af58846fc4fdb025968752) Thanks [@maurodesouza](https://github.com/maurodesouza)! - Enter on a focused separator now toggles the panel after it when the panel before it is not collapsible: a results pane below an editor or logs below charts collapse and expand from the keyboard with no code in the app. When the panel before is collapsible, Enter still toggles it, as before (also when both are). If your app handled Enter on such a separator itself, remove that listener, or the panel toggles twice; a listener that runs first and calls `preventDefault()` keeps control.

## 0.1.0

### Minor Changes

- [#14](https://github.com/fragiola/splitter/pull/14) [`e6abcde`](https://github.com/fragiola/splitter/commit/e6abcded30c6981d0d22b7c6d4542caa176d6c3a) Thanks [@maurodesouza](https://github.com/maurodesouza)! - First release. `@fragiola/splitter` is the framework-free core: the pure layout rules and units (percent, pixels, `em`, `rem`, `vh`, `vw`), a typed model whose every change is a command through a bus with middleware and events (`run`, `can`, `check`, `get`, `is`), a JSON v1 document with its JSON Schema and validator, and the engine that binds a group to the DOM: measurement, pointer drags, the Window Splitter keyboard, right-to-left, collapse, constraints and ARIA values. Zero runtime dependencies.
