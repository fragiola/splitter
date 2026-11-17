import { Component, signal } from "@angular/core";
import { type PanelSize, SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

/** A panel's size as the readout shows it. */
function describe(size: PanelSize | undefined) {
    if (!size) return "…";
    const pixels =
        size.pixels === undefined ? "" : `${Math.round(size.pixels)} px · `;
    return `${pixels}${size.percentage.toFixed(1)}%`;
}

// Constraints in any unit: rem for the file list, percent for the editor, pixels (a bare number)
// for the preview. The model keeps sizes in percent and resolves the other units with the
// group's measured size, so a drag stops at each limit whatever unit declares it.
@Component({
    selector: "example-size-constraints",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div
                    splitterPanel
                    id="files"
                    defaultSize="12rem"
                    minSize="10rem"
                    maxSize="20rem"
                    (resize)="files.set($event.size)"
                >
                    <section aria-label="Files" [class]="styles.panel">
                        <h2 [class]="styles.title">Files</h2>
                        <p [class]="styles.text">10rem to 20rem</p>
                        <output data-testid="files-size" [class]="styles.size">{{
                            describe(files())
                        }}</output>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize files"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="editor" minSize="30%" (resize)="editor.set($event.size)">
                    <section aria-label="Editor" [class]="styles.panel">
                        <h2 [class]="styles.title">Editor</h2>
                        <p [class]="styles.text">at least 30%</p>
                        <output data-testid="editor-size" [class]="styles.size">{{
                            describe(editor())
                        }}</output>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize editor"
                    [class]="styles.separator"
                ></div>
                <div
                    splitterPanel
                    id="preview"
                    [defaultSize]="200"
                    [minSize]="120"
                    [maxSize]="360"
                    (resize)="preview.set($event.size)"
                >
                    <section aria-label="Preview" [class]="styles.panel">
                        <h2 [class]="styles.title">Preview</h2>
                        <p [class]="styles.text">120px to 360px</p>
                        <output data-testid="preview-size" [class]="styles.size">{{
                            describe(preview())
                        }}</output>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class SizeConstraints {
    protected readonly styles = styles;
    protected readonly describe = describe;
    protected readonly files = signal<PanelSize | undefined>(undefined);
    protected readonly editor = signal<PanelSize | undefined>(undefined);
    protected readonly preview = signal<PanelSize | undefined>(undefined);
}
