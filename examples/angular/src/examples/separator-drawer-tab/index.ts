import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import { LucideGripHorizontal } from "@lucide/angular";
import * as styles from "./styles";

// A drawer at the bottom of a vertical group. The separator is a thin line with a tab sticking
// out of it, like a drawer's pull: the tab is the separator's content, so it drags the drawer
// up and down, and the arrows move it once the separator has focus.
@Component({
    selector: "example-separator-drawer-tab",
    imports: [SPLITTER, LucideGripHorizontal],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup orientation="vertical" [class]="styles.group">
                <div splitterPanel id="canvas" minSize="25%">
                    <section aria-label="Canvas" [class]="styles.panel">
                        <h2 [class]="styles.title">Canvas</h2>
                        <p [class]="styles.text">Pull the tab up to open the drawer further.</p>
                    </section>
                </div>
                <div splitterSeparator aria-label="Resize drawer" [class]="styles.separator">
                    <span data-testid="drawer-tab" [class]="styles.tab">
                        <svg lucideGripHorizontal aria-hidden="true" [class]="styles.icon"></svg>
                    </span>
                </div>
                <div splitterPanel id="drawer" defaultSize="35%" minSize="15%" maxSize="70%">
                    <section aria-label="Drawer" [class]="styles.drawer">
                        <h2 [class]="styles.title">Drawer</h2>
                        <p [class]="styles.text">
                            Tab to the separator, then use the up and down arrows.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorDrawerTab {
    protected readonly styles = styles;
}
