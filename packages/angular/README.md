# @fragiola/splitter-angular

Composable, unstyled Angular 22 directives for **Splitter**, headless resizable panel groups:
`splitterGroup`, `splitterPanel` and `splitterSeparator` on your own elements, with nested groups,
collapsible panels, size constraints in any CSS unit, the keyboard and right-to-left. Standalone,
signal-based and zoneless. No CSS, no icons, no cursors and no text: you style every part with
`class`, `style` and its `data-*` attributes.

```sh
pnpm add @fragiola/splitter-angular
```

This one package is all an Angular app installs: it re-exports the whole core
([`@fragiola/splitter`](https://www.npmjs.com/package/@fragiola/splitter)), on which it depends at
the exact same version. `@angular/core` **^22** is a peer dependency. ESM only (Angular Package
Format).

```ts
import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";

@Component({
    selector: "app-split",
    imports: [SPLITTER],
    template: `
        <div splitterGroup style="height: 320px">
            <div splitterPanel id="left" defaultSize="30%">Left</div>
            <div splitterSeparator aria-label="Resize left" style="width: 4px"></div>
            <div splitterPanel id="right">Right</div>
        </div>
    `,
})
export class Split {}
```

Documentation, guides and live examples: **<https://fragiola.com/splitter>**.
