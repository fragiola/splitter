import {
    Component,
    computed,
    DOCUMENT,
    effect,
    inject,
    input,
    signal,
    untracked,
} from "@angular/core";
import { injectSplitter, type SplitterRef } from "@fragiola/splitter-angular";
import { LucideRedo2, LucideUndo2 } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import {
    createUndoHistory,
    type UndoHistory,
    type UndoSnapshot,
    undoKey,
} from "../_kit/undo";
import * as styles from "./styles";

const VERBS: Record<string, string> = {
    "separator.move": "Move a separator",
    "panel.resize": "Resize a panel",
    "panel.collapse": "Collapse a panel",
    "panel.expand": "Expand a panel",
    "group.set-layout": "Set a layout",
    "group.reset": "Reset a layout",
};

const EMPTY: UndoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoSteps: [],
    redoSteps: [],
};

// Undo, redo, and the steps they go through.
@Component({
    selector: "example-undo-redo-toolbar",
    imports: [ClickableButton, LucideUndo2, LucideRedo2],
    host: { class: "contents" },
    template: `
        <div [class]="styles.toolbar">
            <div [class]="styles.buttons">
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [disabled]="!snapshot().canUndo"
                    aria-keyshortcuts="Control+Z Meta+Z"
                    (click)="history()?.undo()"
                >
                    <svg lucideUndo2 aria-hidden="true"></svg>
                    Undo
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    [disabled]="!snapshot().canRedo"
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                    (click)="history()?.redo()"
                >
                    <svg lucideRedo2 aria-hidden="true"></svg>
                    Redo
                </button>
            </div>
            <ol aria-label="History" [class]="styles.history">
                @for (entry of steps(); track $index) {
                    <li [attr.data-undone]="entry.undone ? '' : null" [class]="styles.step">
                        {{ verbs[entry.command] ?? entry.command }}
                    </li>
                } @empty {
                    <li [class]="styles.hint">Each drag, key press or collapse is a step.</li>
                }
            </ol>
        </div>
    `,
})
export class Toolbar {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    protected readonly verbs = VERBS;
    private readonly splitter = injectSplitter(() => this.splitterRef());
    /** The splitter's history: made once its group holds the ref, dropped with it. */
    protected readonly history = signal<UndoHistory | undefined>(undefined);
    protected readonly snapshot = signal<UndoSnapshot>(EMPTY);

    protected readonly steps = computed(() => {
        const snapshot = this.snapshot();
        return [
            ...snapshot.undoSteps.map((command) => ({
                command,
                undone: false,
            })),
            // undone steps after the done ones, the next to redo first
            ...[...snapshot.redoSteps]
                .reverse()
                .map((command) => ({ command, undone: true })),
        ];
    });

    constructor() {
        effect((onCleanup) => {
            const model = this.splitter()?.model;
            if (!model) return;
            untracked(() => {
                const made = createUndoHistory(model);
                this.history.set(made);
                this.snapshot.set(made.getSnapshot());
                const stop = made.subscribe(() =>
                    this.snapshot.set(made.getSnapshot()),
                );
                onCleanup(() => {
                    stop();
                    made.dispose();
                    this.history.set(undefined);
                    this.snapshot.set(EMPTY);
                });
            });
        });

        // the shortcuts, page-wide; never in the middle of a drag (its steps are not committed)
        const document = inject(DOCUMENT);
        effect((onCleanup) => {
            const made = this.history();
            const engine = this.splitter()?.engine;
            if (!made || !engine) return;
            const onKeyDown = (event: KeyboardEvent) => {
                const action = undoKey(event);
                if (!action || engine.get("dragging-separator-id")) return;
                event.preventDefault();
                made[action]();
            };
            document.addEventListener("keydown", onKeyDown);
            onCleanup(() => document.removeEventListener("keydown", onKeyDown));
        });
    }
}
