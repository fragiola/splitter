import { Component } from "@angular/core";
import { createSplitterRef, SPLITTER } from "@fragiola/splitter-angular";
import { LucideFileCode } from "@lucide/angular";
import { ACTIVE, CODE, FILES, OUTLINE, TERMINAL } from "./files";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

// A workbench as an editor lays it out: three groups in one model. The explorer and the outline
// have minimums in rem, the terminal in pixels, and all three collapse; the toolbar toggles them
// through the external ref, and each button follows its panel with `injectSplitterState`.
@Component({
    selector: "example-ide-layout",
    imports: [SPLITTER, LucideFileCode, Toolbar],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-ide-layout-toolbar [splitterRef]="splitterRef" />
            <div splitterGroup id="ide" [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="explorer"
                    defaultSize="22%"
                    minSize="10rem"
                    maxSize="40%"
                    collapsible
                    [class]="styles.side"
                >
                    <nav aria-label="Explorer" [class]="styles.pane">
                        <h2 [class]="styles.heading">Explorer</h2>
                        <ul [class]="styles.list">
                            @for (file of files; track file.path) {
                                <li
                                    [attr.data-active]="file.active ? '' : null"
                                    [class]="styles.file(file.depth)"
                                >
                                    <svg lucideFileCode aria-hidden="true" [class]="styles.icon"></svg>
                                    <span [class]="styles.name">{{ file.name }}</span>
                                </li>
                            }
                        </ul>
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize explorer"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="workspace" minSize="30%">
                    <div
                        splitterGroup
                        id="workspace-column"
                        orientation="vertical"
                        [class]="styles.nested"
                    >
                        <div splitterPanel id="editors" minSize="30%">
                            <div splitterGroup id="editor-row" [class]="styles.nested">
                                <div splitterPanel id="editor" minSize="30%">
                                    <section aria-label="Editor" [class]="styles.editor">
                                        <h2 [class]="styles.tab">{{ active }}</h2>
                                        <pre [class]="styles.code">{{ code }}</pre>
                                    </section>
                                </div>
                                <div
                                    splitterSeparator
                                    aria-label="Resize editor"
                                    [class]="styles.separator"
                                ></div>
                                <div
                                    splitterPanel
                                    id="outline"
                                    defaultSize="26%"
                                    minSize="9rem"
                                    collapsible
                                    [class]="styles.side"
                                >
                                    <section aria-label="Outline" [class]="styles.pane">
                                        <h2 [class]="styles.heading">Outline</h2>
                                        <ul [class]="styles.list">
                                            @for (symbol of outline; track symbol) {
                                                <li [class]="styles.symbol">{{ symbol }}</li>
                                            }
                                        </ul>
                                    </section>
                                </div>
                            </div>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize editors"
                            [class]="styles.separator"
                        ></div>
                        <div
                            splitterPanel
                            id="terminal"
                            defaultSize="30%"
                            [minSize]="96"
                            collapsible
                            [class]="styles.side"
                        >
                            <section aria-label="Terminal" [class]="styles.pane">
                                <h2 [class]="styles.heading">Terminal</h2>
                                <pre [class]="styles.code">{{ terminal }}</pre>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class IdeLayout {
    protected readonly styles = styles;
    protected readonly files = FILES;
    protected readonly active = ACTIVE;
    protected readonly code = CODE;
    protected readonly outline = OUTLINE;
    protected readonly terminal = TERMINAL;
    protected readonly splitterRef = createSplitterRef();
}
