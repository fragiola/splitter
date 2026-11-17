import { Component } from "@angular/core";
import {
    createSplitterModel,
    SPLITTER,
    type SplitterJson,
    validateSplitter,
} from "@fragiola/splitter-angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { load, save } from "../_kit/persistence";
import * as styles from "./styles";

const KEY = "fragiola-splitter:persistent-layout";

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// Persistence is the app's, in `_kit/persistence.ts`: the whole layout (both groups, the collapsed
// panel and the size it expands back to) is the model's JSON document, saved on every commit and
// restored by `createSplitterModel(json)` before the first render, so the page never shows the
// default layout first. Resize, collapse the terminal, then reload.
@Component({
    selector: "example-persistent-layout",
    imports: [SPLITTER, ClickableButton],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <button kitClickable size="sm" variant="outline" (click)="reset()">
                    Reset the layout
                </button>
                <span [class]="styles.hint">Saved in this browser on every change.</span>
            </div>
            <div
                splitterGroup
                id="persistent"
                [model]="model"
                [class]="styles.group"
                (layoutCommit)="persist()"
            >
                <div splitterPanel id="sidebar" defaultSize="25%" minSize="10%">
                    <section aria-label="Sidebar" [class]="styles.panel">
                        <h2 [class]="styles.title">Sidebar</h2>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize sidebar"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="main">
                    <div
                        splitterGroup
                        id="persistent-main"
                        orientation="vertical"
                        [class]="styles.nested"
                        (layoutCommit)="persist()"
                    >
                        <div splitterPanel id="editor" minSize="20%">
                            <section aria-label="Editor" [class]="styles.panel">
                                <h2 [class]="styles.title">Editor</h2>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize editor"
                            [class]="styles.separator"
                        ></div>
                        <div
                            splitterPanel
                            id="terminal"
                            defaultSize="30%"
                            minSize="15%"
                            collapsible
                        >
                            <section aria-label="Terminal" [class]="styles.panel">
                                <h2 [class]="styles.title">Terminal</h2>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class PersistentLayout {
    protected readonly styles = styles;
    protected readonly model = restore();

    protected persist() {
        save(KEY, this.model.get("splitter-json"));
    }

    protected reset() {
        for (const group of this.model.get("groups")) {
            this.model.run("group.reset", { groupId: group.id });
        }
    }
}
