import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

const KEYS = [
    { keys: "← →", does: "resize by 5%" },
    { keys: "Home / End", does: "to the smallest / largest size" },
    { keys: "Enter", does: "collapse or expand the panel before it" },
    { keys: "F6", does: "next separator (Shift+F6: previous)" },
];

// The separators follow the WAI-ARIA Window Splitter pattern: each is focusable, says the size of
// the panel before it (`aria-valuenow`) between its limits (`aria-valuemin`, `aria-valuemax`) and
// names the panel it controls (`aria-controls`). Tab to one and use the keys below.
@Component({
    selector: "example-keyboard",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <dl aria-label="Keys" [class]="styles.keys">
                @for (entry of keys; track entry.keys) {
                    <div [class]="styles.key">
                        <dt [class]="styles.kbd">{{ entry.keys }}</dt>
                        <dd>{{ entry.does }}</dd>
                    </div>
                }
            </dl>
            <div splitterGroup [class]="styles.group">
                <div
                    splitterPanel
                    id="outline"
                    defaultSize="30%"
                    minSize="15%"
                    maxSize="50%"
                    collapsible
                >
                    <section aria-label="Outline" [class]="styles.panel">
                        <h2 [class]="styles.title">Outline</h2>
                        <p [class]="styles.text">15% to 50%, collapsible.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize outline"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="document" minSize="30%">
                    <section aria-label="Document" [class]="styles.panel">
                        <h2 [class]="styles.title">Document</h2>
                        <p [class]="styles.text">At least 30%.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize document"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="comments" defaultSize="25%" minSize="10%">
                    <section aria-label="Comments" [class]="styles.panel">
                        <h2 [class]="styles.title">Comments</h2>
                        <p [class]="styles.text">At least 10%.</p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class Keyboard {
    protected readonly styles = styles;
    protected readonly keys = KEYS;
}
