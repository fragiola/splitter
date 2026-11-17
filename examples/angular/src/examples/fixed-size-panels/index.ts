import { Component, signal } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

// When the group itself resizes (the window, a container), a panel keeps its share by default
// (`preserve-relative-size`). The sidebar here keeps its width in pixels instead
// (`preserve-pixel-size`): the editor takes up the whole change. Narrow the group to see it.
@Component({
    selector: "example-fixed-size-panels",
    imports: [SPLITTER, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [attr.aria-pressed]="narrow()"
                    (click)="narrow.set(!narrow())"
                >
                    Narrow the group
                </button>
            </div>
            <div [class]="styles.stage(narrow())">
                <div splitterGroup [class]="styles.group">
                    <div
                        splitterPanel
                        id="sidebar"
                        [defaultSize]="220"
                        [minSize]="140"
                        groupResizeBehavior="preserve-pixel-size"
                    >
                        <section aria-label="Sidebar" [class]="styles.panel">
                            <h2 [class]="styles.title">Sidebar</h2>
                            <p [class]="styles.text">Keeps its pixels when the group resizes.</p>
                        </section>
                    </div>
                    <div
                        splitterSeparator
                        aria-label="Resize sidebar"
                        [class]="styles.separator"
                    ></div>
                    <div splitterPanel id="editor" minSize="20%">
                        <section aria-label="Editor" [class]="styles.panel">
                            <h2 [class]="styles.title">Editor</h2>
                            <p [class]="styles.text">Takes up the change.</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class FixedSizePanels {
    protected readonly styles = styles;
    protected readonly narrow = signal(false);
}
