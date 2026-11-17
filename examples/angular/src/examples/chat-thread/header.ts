import { Component, computed, input } from "@angular/core";
import {
    injectSplitter,
    injectSplitterState,
    type SplitterRef,
} from "@fragiola/splitter-angular";
import { LucideMessagesSquare, LucideUsers } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

// The header: the workspace, and a toggle that collapses the member list and expands it back.
@Component({
    selector: "example-chat-thread-header",
    imports: [ClickableButton, LucideMessagesSquare, LucideUsers],
    host: { class: "contents" },
    template: `
        <div role="toolbar" aria-label="Chat" [class]="styles.toolbar">
            <span [class]="styles.workspace">
                <svg lucideMessagesSquare aria-hidden="true" [class]="styles.logo"></svg>
                Product team
            </span>
            <button
                kitClickable
                size="sm"
                variant="ghost"
                [attr.aria-pressed]="!collapsed()"
                [class]="styles.toggle"
                (click)="toggle()"
            >
                <svg lucideUsers aria-hidden="true"></svg>
                Members
            </button>
        </div>
    `,
})
export class Header {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    // recomputed when the members collapse or expand, however it happens (a drag, Enter, a click)
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "members" }),
        { splitterRef: () => this.splitterRef() },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);

    protected toggle() {
        this.splitter()?.model.run(
            this.collapsed() ? "panel.expand" : "panel.collapse",
            { panelId: "members" },
        );
    }
}
