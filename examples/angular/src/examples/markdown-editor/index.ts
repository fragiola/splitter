import { Component, computed, signal } from "@angular/core";
import { createSplitterRef, SPLITTER } from "@fragiola/splitter-angular";
import { SWITCH } from "#/components/ui/switch";
import { renderMarkdown } from "./render";
import { SAMPLE } from "./sample";
import * as styles from "./styles";
import { ViewModes } from "./view-modes";

let made = 0;

// An editor beside its live preview. The view buttons outside the group drive it through the
// external ref: Editor and Preview collapse the other pane, Split expands it back to the size it
// had, and the pressed button is read from the model (`injectSplitterState`), so a drag that
// collapses a pane presses its button too. The switch changes the group's orientation; the
// layout is in percent, so the panes keep their sizes when they stack.
@Component({
    selector: "example-markdown-editor",
    imports: [SPLITTER, SWITCH, ViewModes],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div role="toolbar" aria-label="View" [class]="styles.toolbar">
                <example-markdown-editor-view-modes [splitterRef]="splitterRef" />
                <span [class]="styles.stack">
                    <button kitSwitch [(checked)]="stacked" [attr.aria-labelledby]="stackedLabel">
                        <span kitSwitchThumb></span>
                    </button>
                    <span [id]="stackedLabel">Stacked</span>
                </span>
            </div>
            <div
                splitterGroup
                id="markdown"
                [orientation]="stacked() ? 'vertical' : 'horizontal'"
                [splitterRef]="splitterRef"
                [class]="styles.group"
            >
                <div splitterPanel id="editor" minSize="20%" collapsible [class]="styles.side">
                    <section aria-label="Editor" [class]="styles.pane">
                        <h2 [class]="styles.tab">notes.md</h2>
                        <textarea
                            aria-label="Markdown"
                            spellcheck="false"
                            [value]="text()"
                            [class]="styles.source"
                            (input)="edit($event)"
                        ></textarea>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize editor"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="preview" minSize="20%" collapsible>
                    <section aria-label="Preview" [class]="styles.page">
                        <h2 [class]="styles.tab">Preview</h2>
                        <div data-testid="preview" [class]="styles.preview" [innerHTML]="html()"></div>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class MarkdownEditor {
    protected readonly styles = styles;
    protected readonly splitterRef = createSplitterRef();
    protected readonly text = signal(SAMPLE);
    protected readonly stacked = signal(false);
    // escaped by construction (render.ts): the only tags in it are the renderer's own, which
    // Angular's sanitizer keeps as they are
    protected readonly html = computed(() => renderMarkdown(this.text()));
    // the id that names the switch (React's `useId`)
    protected readonly stackedLabel = `markdown-editor-stacked-${made++}`;

    protected edit(event: Event) {
        this.text.set((event.target as HTMLTextAreaElement).value);
    }
}
