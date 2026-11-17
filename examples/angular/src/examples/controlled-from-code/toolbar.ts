import { Component, input } from "@angular/core";
import { injectSplitter, type SplitterRef } from "@fragiola/splitter-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

// Buttons that run commands on the group's model: they never touch the DOM.
@Component({
    selector: "example-controlled-from-code-toolbar",
    imports: [ClickableButton],
    host: { class: "contents" },
    template: `
        @if (splitter()) {
            <div [class]="styles.toolbar">
                <button kitClickable size="sm" variant="outline" (click)="resizeSidebar('20%')">
                    Sidebar at 20%
                </button>
                <button kitClickable size="sm" variant="outline" (click)="resizeSidebar('40%')">
                    Sidebar at 40%
                </button>
                <button kitClickable size="sm" variant="outline" (click)="toggleInspector()">
                    Toggle the inspector
                </button>
                <button kitClickable size="sm" variant="outline" (click)="reset()">
                    Reset
                </button>
            </div>
        }
    `,
})
export class Toolbar {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    protected readonly splitter = injectSplitter(() => this.splitterRef());

    protected resizeSidebar(size: string) {
        this.splitter()?.model.run("panel.resize", {
            panelId: "sidebar",
            size,
        });
    }

    protected toggleInspector() {
        const model = this.splitter()?.model;
        if (!model) return;
        if (model.is("panel-collapsed", { panelId: "inspector" })) {
            model.run("panel.expand", { panelId: "inspector" });
        } else {
            model.run("panel.collapse", { panelId: "inspector" });
        }
    }

    protected reset() {
        const current = this.splitter();
        current?.model.run("group.reset", { groupId: current.groupId });
    }
}
