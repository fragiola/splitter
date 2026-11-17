# @fragiola/splitter-vue

Composable, unstyled Vue 3.5 primitives for **Splitter**, headless resizable panel groups:
`Splitter.Group`, `Splitter.Panel` and `Splitter.Separator`, with nested groups, collapsible
panels, size constraints in any CSS unit, the keyboard and right-to-left. No CSS, no icons, no
cursors and no text: you style every part with `class`, `style` and its `data-*` attributes.

```sh
pnpm add @fragiola/splitter-vue
```

This one package is all a Vue app installs: it re-exports the whole core
([`@fragiola/splitter`](https://www.npmjs.com/package/@fragiola/splitter)), on which it depends at
the exact same version. `vue` **^3.5** is a peer dependency. ESM only.

```vue
<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
</script>

<template>
    <Splitter.Group :style="{ height: '320px' }">
        <Splitter.Panel id="left" default-size="30%">Left</Splitter.Panel>
        <Splitter.Separator aria-label="Resize left" :style="{ width: '4px' }" />
        <Splitter.Panel id="right">Right</Splitter.Panel>
    </Splitter.Group>
</template>
```

Documentation, guides and live examples: **<https://fragiola.com/splitter>**.
