import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import { LucideGripVertical } from "@lucide/angular";
import * as styles from "./styles";

// Everything the separators look like comes from their state attributes and the theme's tokens:
// a wide hit area with a hairline and a grip, the cursor from `data-orientation`, the colours from
// hover, `data-dragging` and focus, and the whole group dimmed while one of its separators drags
// (`data-dragging` on the group too). The package writes only the flex sizing.
@Component({
    selector: "example-styling-showcase",
    imports: [SPLITTER, LucideGripVertical],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="blue" defaultSize="34%" [class]="styles.blue">
                    <section aria-label="Blue" [class]="styles.panel">
                        <h2 [class]="styles.title">Blue</h2>
                        <p [class]="styles.text">Panels take any palette.</p>
                    </section>
                </div>
                <div splitterSeparator aria-label="Resize blue" [class]="styles.separator">
                    <span [class]="styles.grip">
                        <svg lucideGripVertical aria-hidden="true" [class]="styles.icon"></svg>
                    </span>
                </div>
                <div splitterPanel id="stack">
                    <div splitterGroup orientation="vertical" [class]="styles.nested">
                        <div splitterPanel id="green" [class]="styles.green">
                            <section aria-label="Green" [class]="styles.panel">
                                <h2 [class]="styles.title">Green</h2>
                                <p [class]="styles.text">The grip turns with the separator.</p>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize green"
                            [class]="styles.separator"
                        >
                            <span [class]="styles.grip">
                                <svg
                                    lucideGripVertical
                                    aria-hidden="true"
                                    [class]="styles.icon"
                                ></svg>
                            </span>
                        </div>
                        <div splitterPanel id="orange" [class]="styles.orange">
                            <section aria-label="Orange" [class]="styles.panel">
                                <h2 [class]="styles.title">Orange</h2>
                                <p [class]="styles.text">Hover, drag or focus a separator.</p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class StylingShowcase {
    protected readonly styles = styles;
}
