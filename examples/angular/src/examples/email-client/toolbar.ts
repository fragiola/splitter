import { Component, computed, input } from "@angular/core";
import {
    injectSplitter,
    injectSplitterState,
    type SplitterRef,
} from "@fragiola/splitter-angular";
import { LucidePanelLeft } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

// The toolbar: a toggle that collapses the folders to their rail and expands them back.
@Component({
    selector: "example-email-client-toolbar",
    imports: [ClickableButton, LucidePanelLeft],
    host: { class: "contents" },
    template: `
        <div role="toolbar" aria-label="Mail" [class]="styles.toolbar">
            <button
                kitClickable
                size="sm"
                variant="ghost"
                [attr.aria-pressed]="!collapsed()"
                [class]="styles.toggle"
                (click)="toggle()"
            >
                <svg lucidePanelLeft aria-hidden="true"></svg>
                Folders
            </button>
            <span [class]="styles.hint">Layout saved in this browser.</span>
        </div>
    `,
})
export class Toolbar {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    // recomputed when the folders collapse or expand, however it happens (a drag, Enter, a click)
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "folders" }),
        { splitterRef: () => this.splitterRef() },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);

    protected toggle() {
        this.splitter()?.model.run(
            this.collapsed() ? "panel.expand" : "panel.collapse",
            { panelId: "folders" },
        );
    }
}
