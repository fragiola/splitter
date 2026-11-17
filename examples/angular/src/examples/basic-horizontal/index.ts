import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// Three panels side by side. Each declares its default size; each separator carries its own
// accessible name (the package renders none). Drag a separator, or double click it to put the
// panel before it back to its default size.
@Component({
    selector: "example-basic-horizontal",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="navigation" defaultSize="25%">
                    <section aria-label="Navigation" [class]="styles.panel">
                        <h2 [class]="styles.title">Navigation</h2>
                        <p [class]="styles.text">25% to start with.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize navigation"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="content" defaultSize="50%">
                    <section aria-label="Content" [class]="styles.panel">
                        <h2 [class]="styles.title">Content</h2>
                        <p [class]="styles.text">
                            Drag a separator, or double click it to reset its panel.
                        </p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize content"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="details" defaultSize="25%">
                    <section aria-label="Details" [class]="styles.panel">
                        <h2 [class]="styles.title">Details</h2>
                        <p [class]="styles.text">25% to start with.</p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class BasicHorizontal {
    protected readonly styles = styles;
}
