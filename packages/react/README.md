# @fragiola/splitter-react

Composable, unstyled React 19 primitives for **Splitter**, headless resizable panel groups:
`Splitter.Group`, `Splitter.Panel` and `Splitter.Separator`, with nested groups, collapsible
panels, size constraints in any CSS unit, the keyboard and right-to-left. No CSS, no icons, no
cursors and no text: you style every part with `className`, `style` and its `data-*` attributes.

```sh
pnpm add @fragiola/splitter-react
```

This one package is all a React app installs: it re-exports the whole core
([`@fragiola/splitter`](https://www.npmjs.com/package/@fragiola/splitter)), on which it depends at
the exact same version. `react` and `react-dom` **^19** are peer dependencies. ESM only.

```tsx
import { Splitter } from "@fragiola/splitter-react";

export function TwoPanes() {
    return (
        <Splitter.Group style={{ height: 320 }}>
            <Splitter.Panel id="left" defaultSize="30%">Left</Splitter.Panel>
            <Splitter.Separator aria-label="Resize left" style={{ width: 4 }} />
            <Splitter.Panel id="right">Right</Splitter.Panel>
        </Splitter.Group>
    );
}
```

Documentation, guides and live examples: **<https://fragiola.com/splitter>**.
