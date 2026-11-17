import { Component, signal } from "@angular/core";
import {
    createSplitterRef,
    type Layout,
    SPLITTER,
} from "@fragiola/splitter-angular";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

/** The layout as the readout shows it: each panel's size, rounded. */
function describe(layout: Readonly<Layout> | undefined) {
    if (!layout) return "…";
    return Object.entries(layout)
        .map(([panelId, size]) => `${panelId} ${Math.round(size)}%`)
        .join(" · ");
}

// Code outside the group drives it through an external ref: `createSplitterRef()` is given to the
// group, and `injectSplitter(splitterRef)` hands its model to the toolbar, which runs commands on
// it. The readout follows `layoutChange`, drags included.
@Component({
    selector: "example-controlled-from-code",
    imports: [SPLITTER, Toolbar],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-controlled-from-code-toolbar [splitterRef]="splitterRef" />
            <output data-testid="layout" [class]="styles.readout">{{ describe(layout()) }}</output>
            <div
                splitterGroup
                id="editor-layout"
                [splitterRef]="splitterRef"
                [class]="styles.group"
                (layoutChange)="layout.set($event)"
            >
                <div splitterPanel id="sidebar" defaultSize="25%" minSize="10%">
                    <section aria-label="Sidebar" [class]="styles.panel">
                        <h2 [class]="styles.title">Sidebar</h2>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize sidebar"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="editor" minSize="30%">
                    <section aria-label="Editor" [class]="styles.panel">
                        <h2 [class]="styles.title">Editor</h2>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize editor"
                    [class]="styles.separator"
                ></div>
                <div
                    splitterPanel
                    id="inspector"
                    defaultSize="25%"
                    minSize="15%"
                    collapsible
                >
                    <section aria-label="Inspector" [class]="styles.panel">
                        <h2 [class]="styles.title">Inspector</h2>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class ControlledFromCode {
    protected readonly styles = styles;
    protected readonly describe = describe;
    protected readonly splitterRef = createSplitterRef();
    protected readonly layout = signal<Readonly<Layout> | undefined>(undefined);
}
