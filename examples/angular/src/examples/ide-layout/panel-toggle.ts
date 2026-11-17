import { Component, computed, input } from "@angular/core";
import {
    injectSplitter,
    injectSplitterState,
    type SplitterRef,
} from "@fragiola/splitter-angular";
import { LucideDynamicIcon, type LucideIcon } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

/** The panels the toolbar collapses and expands. */
export type Collapsible = "explorer" | "outline" | "terminal";

/** A toolbar button for one collapsible panel: pressed while the panel shows. */
@Component({
    selector: "example-ide-layout-panel-toggle",
    imports: [ClickableButton, LucideDynamicIcon],
    host: { class: "contents" },
    template: `
        <button
            kitClickable
            size="sm"
            variant="ghost"
            [attr.aria-pressed]="!collapsed()"
            [class]="styles.toggle"
            (click)="toggle()"
        >
            <svg [lucideIcon]="icon()" aria-hidden="true"></svg>
            {{ label() }}
        </button>
    `,
})
export class PanelToggle {
    readonly splitterRef = input.required<SplitterRef>();
    readonly panelId = input.required<Collapsible>();
    readonly label = input.required<string>();
    readonly icon = input.required<LucideIcon>();
    protected readonly styles = styles;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    // recomputed when the panel collapses or expands, however it happens (a drag, Enter, a button)
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: this.panelId() }),
        { splitterRef: () => this.splitterRef() },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);

    protected toggle() {
        this.splitter()?.model.run(
            this.collapsed() ? "panel.expand" : "panel.collapse",
            { panelId: this.panelId() },
        );
    }
}
