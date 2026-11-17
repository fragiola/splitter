import { Component, input } from "@angular/core";
import type { SplitterRef } from "@fragiola/splitter-angular";
import {
    LucidePanelBottom,
    LucidePanelLeft,
    LucidePanelRight,
} from "@lucide/angular";
import { PanelToggle } from "./panel-toggle";
import * as styles from "./styles";

const TOGGLES = [
    { panelId: "explorer", label: "Explorer", icon: LucidePanelLeft },
    { panelId: "outline", label: "Outline", icon: LucidePanelRight },
    { panelId: "terminal", label: "Terminal", icon: LucidePanelBottom },
] as const;

// One toggle per collapsible panel: pressed while the panel shows.
@Component({
    selector: "example-ide-layout-toolbar",
    imports: [PanelToggle],
    host: { class: "contents" },
    template: `
        <div role="toolbar" aria-label="Panels" [class]="styles.toolbar">
            @for (toggle of toggles; track toggle.panelId) {
                <example-ide-layout-panel-toggle
                    [splitterRef]="splitterRef()"
                    [panelId]="toggle.panelId"
                    [label]="toggle.label"
                    [icon]="toggle.icon"
                />
            }
        </div>
    `,
})
export class Toolbar {
    readonly splitterRef = input.required<SplitterRef>();
    protected readonly styles = styles;
    protected readonly toggles = TOGGLES;
}
