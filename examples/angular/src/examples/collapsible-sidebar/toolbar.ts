import { Component, computed, input } from "@angular/core";
import {
    injectSplitter,
    injectSplitterState,
    type SplitterRef,
} from "@fragiola/splitter-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

// A button outside the group: it collapses and expands the sidebar through the model.
@Component({
    selector: "example-collapsible-sidebar-toolbar",
    imports: [ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.toolbar">
            <button kitClickable size="sm" variant="outline" (click)="toggle()">
                {{ collapsed() ? "Expand the sidebar" : "Collapse the sidebar" }}
            </button>
        </div>
    `,
})
export class Toolbar {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    // undefined until the group holds the ref, then recomputed on every collapse and expand
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "sidebar" }),
        { splitterRef: () => this.splitterRef() },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);

    protected toggle() {
        const model = this.splitter()?.model;
        if (!model) return;
        if (this.collapsed()) {
            model.run("panel.expand", { panelId: "sidebar" });
        } else {
            model.run("panel.collapse", { panelId: "sidebar" });
        }
    }
}
