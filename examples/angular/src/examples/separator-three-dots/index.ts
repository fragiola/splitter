import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// Three dots in the middle of each separator. They line up along it, read from its own
// `data-orientation`: a column between side by side panels, a row between stacked ones. Hover,
// `data-dragging` and focus light them. The dots are the separator's content, so they take the
// pointer like the rest of it.
@Component({
    selector: "example-separator-three-dots",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="inbox" defaultSize="35%" minSize="15%">
                    <section aria-label="Inbox" [class]="styles.panel">
                        <h2 [class]="styles.title">Inbox</h2>
                        <p [class]="styles.text">The dots stand in a column here.</p>
                    </section>
                </div>
                <div splitterSeparator aria-label="Resize inbox" [class]="styles.separator">
                    <span data-testid="grip" [class]="styles.grip">
                        <span data-testid="dot" [class]="styles.dot"></span>
                        <span data-testid="dot" [class]="styles.dot"></span>
                        <span data-testid="dot" [class]="styles.dot"></span>
                    </span>
                </div>
                <div splitterPanel id="message">
                    <div splitterGroup orientation="vertical" [class]="styles.nested">
                        <div splitterPanel id="reader" minSize="20%">
                            <section aria-label="Reader" [class]="styles.panel">
                                <h2 [class]="styles.title">Reader</h2>
                                <p [class]="styles.text">Below, they turn into a row.</p>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize reader"
                            [class]="styles.separator"
                        >
                            <span data-testid="grip" [class]="styles.grip">
                                <span data-testid="dot" [class]="styles.dot"></span>
                                <span data-testid="dot" [class]="styles.dot"></span>
                                <span data-testid="dot" [class]="styles.dot"></span>
                            </span>
                        </div>
                        <div splitterPanel id="reply" defaultSize="35%" minSize="15%">
                            <section aria-label="Reply" [class]="styles.panel">
                                <h2 [class]="styles.title">Reply</h2>
                                <p [class]="styles.text">Hover, drag or focus a separator.</p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorThreeDots {
    protected readonly styles = styles;
}
