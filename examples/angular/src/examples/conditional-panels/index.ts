import { Component, signal } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import { SWITCH } from "#/components/ui/switch";
import * as styles from "./styles";

let made = 0;

// Panels rendered conditionally: each takes its place from its position in the markup, never
// from when it mounts, so the inspector shown again lands at the end. A separator goes with the
// panel it belongs to. The group remembers a layout per set of panels: resize, hide the inspector
// and show it again, and every panel comes back at the size it had.
@Component({
    selector: "example-conditional-panels",
    imports: [SPLITTER, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <span [class]="styles.toggle">
                    <button kitSwitch [(checked)]="sidebar" [attr.aria-labelledby]="sidebarLabel">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="sidebarLabel">Sidebar</span>
                </span>
                <span [class]="styles.toggle">
                    <button
                        kitSwitch
                        [(checked)]="inspector"
                        [attr.aria-labelledby]="inspectorLabel"
                    >
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="inspectorLabel">Inspector</span>
                </span>
            </div>
            <div splitterGroup [class]="styles.group">
                @if (sidebar()) {
                    <div splitterPanel id="sidebar" defaultSize="25%" minSize="10%">
                        <section aria-label="Sidebar" [class]="styles.panel">
                            <h2 [class]="styles.title">Sidebar</h2>
                            <p [class]="styles.text">Rendered while its switch is on.</p>
                        </section>
                    </div>
                    <div
                        splitterSeparator
                        aria-label="Resize sidebar"
                        [class]="styles.separator"
                    ></div>
                }
                <div splitterPanel id="editor" minSize="20%">
                    <section aria-label="Editor" [class]="styles.panel">
                        <h2 [class]="styles.title">Editor</h2>
                        <p [class]="styles.text">Always rendered.</p>
                    </section>
                </div>
                @if (inspector()) {
                    <div
                        splitterSeparator
                        aria-label="Resize inspector"
                        [class]="styles.separator"
                    ></div>
                    <div splitterPanel id="inspector" defaultSize="25%" minSize="10%">
                        <section aria-label="Inspector" [class]="styles.panel">
                            <h2 [class]="styles.title">Inspector</h2>
                            <p [class]="styles.text">
                                Comes back at the end, where the markup puts it.
                            </p>
                        </section>
                    </div>
                }
            </div>
        </div>
    `,
})
export default class ConditionalPanels {
    protected readonly styles = styles;
    protected readonly sidebar = signal(true);
    protected readonly inspector = signal(true);
    // the ids that name the switches (React's `useId`)
    private readonly n = made++;
    protected readonly sidebarLabel = `conditional-panels-sidebar-${this.n}`;
    protected readonly inspectorLabel =
        `conditional-panels-inspector-${this.n}`;
}
