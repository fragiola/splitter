import { Component } from "@angular/core";
import { createSplitterRef, SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

// Undo and redo are the app's, in `_kit/undo.ts`: it listens to the model (`model.subscribe`) and
// keeps every group's layout before and after each committed change; undo and redo put them back
// in one `batch`. A whole drag is one step, so is a key press or a collapse. Ctrl/Cmd+Z undoes,
// Shift+Ctrl/Cmd+Z redoes.
@Component({
    selector: "example-undo-redo",
    imports: [SPLITTER, Toolbar],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-undo-redo-toolbar [splitterRef]="splitterRef" />
            <div splitterGroup [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="outline"
                    defaultSize="25%"
                    minSize="15%"
                    collapsible
                >
                    <section aria-label="Outline" [class]="styles.panel">
                        <h2 [class]="styles.title">Outline</h2>
                        <p [class]="styles.text">Collapsible.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize outline"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="draft" minSize="30%">
                    <section aria-label="Draft" [class]="styles.panel">
                        <h2 [class]="styles.title">Draft</h2>
                        <p [class]="styles.text">Drag, press keys on a separator, then undo.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize draft"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="notes" defaultSize="25%" minSize="10%">
                    <section aria-label="Notes" [class]="styles.panel">
                        <h2 [class]="styles.title">Notes</h2>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class UndoRedo {
    protected readonly styles = styles;
    protected readonly splitterRef = createSplitterRef();
}
