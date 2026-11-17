import { Component } from "@angular/core";
import { createSplitterRef, SPLITTER } from "@fragiola/splitter-angular";
import {
    LucideDynamicIcon,
    LucideFileText,
    LucideFolder,
    LucideSearch,
    LucideSettings,
} from "@lucide/angular";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const ITEMS = [
    { label: "Files", icon: LucideFolder },
    { label: "Search", icon: LucideSearch },
    { label: "Notes", icon: LucideFileText },
    { label: "Settings", icon: LucideSettings },
];

// A collapsible panel collapses when a drag takes it past half its minimum, down to its collapsed
// size (a rail of 3rem here), and remembers the size it had: dragging it back, Enter on the
// separator or `panel.expand` restores it. The sidebar shows its labels only while expanded,
// styled from its `data-collapsed`. The toolbar outside the group follows the panel with
// `injectSplitterState`.
@Component({
    selector: "example-collapsible-sidebar",
    imports: [SPLITTER, LucideDynamicIcon, Toolbar],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-collapsible-sidebar-toolbar [splitterRef]="splitterRef" />
            <div splitterGroup [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="sidebar"
                    defaultSize="25%"
                    minSize="10rem"
                    collapsible
                    collapsedSize="3rem"
                    [class]="styles.sidebar"
                >
                    <nav aria-label="Sidebar" [class]="styles.nav">
                        @for (item of items; track item.label) {
                            <a
                                [href]="'#' + item.label.toLowerCase()"
                                [attr.aria-label]="item.label"
                                [class]="styles.item"
                            >
                                <svg [lucideIcon]="item.icon" aria-hidden="true" [class]="styles.icon"></svg>
                                <span [class]="styles.label">{{ item.label }}</span>
                            </a>
                        }
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize sidebar"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="main">
                    <section aria-label="Document" [class]="styles.panel">
                        <h2 [class]="styles.title">Document</h2>
                        <p [class]="styles.text">
                            Drag the sidebar narrower than 10rem to collapse it.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class CollapsibleSidebar {
    protected readonly styles = styles;
    protected readonly items = ITEMS;
    protected readonly splitterRef = createSplitterRef();
}
