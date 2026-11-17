import { Component, computed } from "@angular/core";
import {
    createSplitterRef,
    injectSplitter,
    injectSplitterState,
    SPLITTER,
} from "@fragiola/splitter-angular";
import { LucideChevronLeft } from "@lucide/angular";
import * as styles from "./styles";

// A button on the separator collapses and expands the panel before it through the model
// (`panel.collapse`, `panel.expand`); its icon turns from the panel's `data-collapsed`, its name
// follows `injectSplitterState`. Content inside a separator can keep its events from the
// separator: its listeners stop them (`stopPropagation()`), so pressing the button never starts a
// drag, its keys never move the separator, and a double click on it never resets the layout.
@Component({
    selector: "example-separator-collapse-button",
    imports: [SPLITTER, LucideChevronLeft],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="outline"
                    defaultSize="30%"
                    minSize="10rem"
                    collapsible
                >
                    <section aria-label="Outline" [class]="styles.side">
                        <h2 [class]="styles.title">Outline</h2>
                        <p [class]="styles.text">
                            Use the button on the separator to hide this panel.
                        </p>
                    </section>
                </div>
                <div splitterSeparator aria-label="Resize outline" [class]="styles.separator">
                    <button
                        type="button"
                        [attr.aria-label]="collapsed() ? 'Expand the outline' : 'Collapse the outline'"
                        aria-controls="outline"
                        [attr.aria-expanded]="!collapsed()"
                        [class]="styles.toggle"
                        (click)="toggle()"
                        (pointerdown)="$event.stopPropagation()"
                        (keydown)="$event.stopPropagation()"
                        (dblclick)="$event.stopPropagation()"
                    >
                        <svg lucideChevronLeft aria-hidden="true" [class]="styles.icon"></svg>
                    </button>
                </div>
                <div splitterPanel id="page">
                    <section aria-label="Page" [class]="styles.panel">
                        <h2 [class]="styles.title">Page</h2>
                        <p [class]="styles.text">
                            The separator still drags, and Enter on it still collapses the outline.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorCollapseButton {
    protected readonly styles = styles;
    protected readonly splitterRef = createSplitterRef();
    private readonly splitter = injectSplitter(this.splitterRef);
    // undefined until the group holds the ref, then recomputed on every collapse and expand
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "outline" }),
        { splitterRef: this.splitterRef },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);

    protected toggle() {
        const model = this.splitter()?.model;
        if (!model) return;
        if (this.collapsed()) model.run("panel.expand", { panelId: "outline" });
        else model.run("panel.collapse", { panelId: "outline" });
    }
}
