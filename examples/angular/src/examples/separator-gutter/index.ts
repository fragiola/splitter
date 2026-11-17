import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// Panels drawn as cards on a canvas. The gap between two cards is the separator: transparent at
// rest, so only the canvas shows, it draws a line on hover, while `data-dragging` and on focus.
@Component({
    selector: "example-separator-gutter",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="tasks" defaultSize="40%" minSize="20%" [class]="styles.card">
                    <section aria-label="Tasks" [class]="styles.panel">
                        <h2 [class]="styles.title">Tasks</h2>
                        <p [class]="styles.text">The gap between the cards is the separator.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize tasks"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="details">
                    <div splitterGroup orientation="vertical" [class]="styles.nested">
                        <div splitterPanel id="summary" minSize="20%" [class]="styles.card">
                            <section aria-label="Summary" [class]="styles.panel">
                                <h2 [class]="styles.title">Summary</h2>
                                <p [class]="styles.text">Hover a gap to see its line.</p>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize summary"
                            [class]="styles.separator"
                        ></div>
                        <div
                            splitterPanel
                            id="activity"
                            defaultSize="40%"
                            minSize="20%"
                            [class]="styles.card"
                        >
                            <section aria-label="Activity" [class]="styles.panel">
                                <h2 [class]="styles.title">Activity</h2>
                                <p [class]="styles.text">Tab to a gap: focus draws it too.</p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorGutter {
    protected readonly styles = styles;
}
