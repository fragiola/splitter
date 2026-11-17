import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// A code editor's sash. The separator is 1px (what the engine measures) and its `::before` is a
// 9px hit area that never changes. Its `::after` is what you see: a 1px line at rest that, after
// the pointer rests on it for a moment (a `transition-delay`), while `data-dragging` and on focus,
// grows to 4px in the accent colour.
@Component({
    selector: "example-separator-sash",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="explorer" defaultSize="28%" minSize="15%">
                    <section aria-label="Explorer" [class]="styles.panel">
                        <h2 [class]="styles.title">Explorer</h2>
                        <p [class]="styles.text">
                            Rest the pointer on a line: it thickens after a moment.
                        </p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize explorer"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="work">
                    <div splitterGroup orientation="vertical" [class]="styles.nested">
                        <div splitterPanel id="editor" minSize="20%">
                            <section aria-label="Editor" [class]="styles.panel">
                                <h2 [class]="styles.title">Editor</h2>
                                <p [class]="styles.text">Dragging shows the sash at once.</p>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize editor"
                            [class]="styles.separator"
                        ></div>
                        <div splitterPanel id="terminal" defaultSize="35%" minSize="15%">
                            <section aria-label="Terminal" [class]="styles.panel">
                                <h2 [class]="styles.title">Terminal</h2>
                                <p [class]="styles.text">
                                    The hit area stays the same in every state.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorSash {
    protected readonly styles = styles;
}
