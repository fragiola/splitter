import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

const LINES = [
    "$ pnpm dev",
    "VITE ready in 212 ms",
    "➜ Local: http://localhost:5184/",
];

// A vertical group stacks its panels: the separator between them is horizontal
// (`aria-orientation="horizontal"`), drags up and down, and its arrows are Up and Down.
@Component({
    selector: "example-vertical",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup orientation="vertical" [class]="styles.group">
                <div splitterPanel id="editor" defaultSize="65%" minSize="20%">
                    <section aria-label="Editor" [class]="styles.panel">
                        <h2 [class]="styles.title">Editor</h2>
                        <p [class]="styles.text">Drag the separator up or down.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize editor"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="terminal" minSize="15%">
                    <section aria-label="Terminal" [class]="styles.panel">
                        <h2 [class]="styles.title">Terminal</h2>
                        <pre [class]="styles.code">{{ lines }}</pre>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class Vertical {
    protected readonly styles = styles;
    protected readonly lines = LINES.join("\n");
}
