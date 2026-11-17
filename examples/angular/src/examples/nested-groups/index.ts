import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// A group inside a panel nests in it: it joins the outer group's model (one
// `model.get("splitter-json")` saves both) and its path starts with that panel's (`/g0/p1/g0`).
// Each separator resizes its own group only.
@Component({
    selector: "example-nested-groups",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup id="workbench" [class]="styles.group">
                <div splitterPanel id="sidebar" defaultSize="28%" minSize="15%">
                    <section aria-label="Sidebar" [class]="styles.panel">
                        <h2 [class]="styles.title">Sidebar</h2>
                        <p [class]="styles.text">The outer group.</p>
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
                        id="main-column"
                        orientation="vertical"
                        [class]="styles.nested"
                    >
                        <div splitterPanel id="editor" defaultSize="65%">
                            <section aria-label="Editor" [class]="styles.panel">
                                <h2 [class]="styles.title">Editor</h2>
                                <p [class]="styles.text">
                                    A vertical group nested in the main panel.
                                </p>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize editor"
                            [class]="styles.separator"
                        ></div>
                        <div splitterPanel id="terminal">
                            <section aria-label="Terminal" [class]="styles.panel">
                                <h2 [class]="styles.title">Terminal</h2>
                                <p [class]="styles.text">
                                    Its separator moves the editor and the terminal only.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class NestedGroups {
    protected readonly styles = styles;
}
