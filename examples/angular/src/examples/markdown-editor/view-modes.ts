import { Component, computed, input } from "@angular/core";
import {
    type BatchEntry,
    injectSplitter,
    injectSplitterState,
    type SplitterRef,
} from "@fragiola/splitter-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import * as styles from "./styles";

type ViewMode = "editor" | "split" | "preview";

const MODES: { mode: ViewMode; label: string }[] = [
    { mode: "editor", label: "Editor" },
    { mode: "split", label: "Split" },
    { mode: "preview", label: "Preview" },
];

/** The two panes, in the order the batch expands them. */
const PANES = ["editor", "preview"] as const;

type Pane = (typeof PANES)[number];

/** The segmented control: one pressed button, the mode the model is in. */
@Component({
    selector: "example-markdown-editor-view-modes",
    imports: [ClickableButton],
    host: { class: "contents" },
    template: `
        <fieldset aria-label="Mode" [class]="styles.modes">
            @for (item of modes; track item.mode) {
                <button
                    kitClickable
                    size="sm"
                    variant="ghost"
                    [attr.aria-pressed]="current() === item.mode"
                    [class]="styles.mode"
                    (click)="show(item.mode)"
                >
                    {{ item.label }}
                </button>
            }
        </fieldset>
    `,
})
export class ViewModes {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    protected readonly modes = MODES;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    // recomputed when a pane collapses or expands, however it happens (a button, a drag, Enter)
    private readonly state = injectSplitterState(
        ({ model }): ViewMode =>
            model.is("panel-collapsed", { panelId: "editor" })
                ? "preview"
                : model.is("panel-collapsed", { panelId: "preview" })
                  ? "editor"
                  : "split",
        { splitterRef: () => this.splitterRef() },
    );
    protected readonly current = computed(() => this.state() ?? "split");

    protected show(mode: ViewMode) {
        const model = this.splitter()?.model;
        if (!model) return;
        const shown = (panelId: Pane) => mode === "split" || mode === panelId;
        const collapsed = (panelId: Pane) =>
            model.is("panel-collapsed", { panelId });
        // one atomic step: expand what the mode shows, then collapse what it hides
        const commands: BatchEntry[] = [
            ...PANES.filter((p) => shown(p) && collapsed(p)).map((panelId) => ({
                command: "panel.expand" as const,
                payload: { panelId },
            })),
            ...PANES.filter((p) => !shown(p) && !collapsed(p)).map(
                (panelId) => ({
                    command: "panel.collapse" as const,
                    payload: { panelId },
                }),
            ),
        ];
        if (commands.length > 0) model.run("batch", { commands });
    }
}
