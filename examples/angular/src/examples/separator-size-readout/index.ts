import { Component, computed } from "@angular/core";
import {
    createSplitterRef,
    injectSplitterState,
    SPLITTER,
} from "@fragiola/splitter-angular";
import * as styles from "./styles";

// A badge on the separator shows the size of the panel before it. The size comes from the model
// (`panel-size-by` through `injectSplitterState`), so it follows every drag step and every key;
// the badge shows only while the separator is dragged (`data-dragging`) or focused from the
// keyboard. It is hidden from assistive technology: the separator already says its value
// (`aria-valuenow`).
@Component({
    selector: "example-separator-size-readout",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div splitterGroup [splitterRef]="splitterRef" [class]="styles.group">
                <div splitterPanel id="source" defaultSize="50%" minSize="20%">
                    <section aria-label="Source" [class]="styles.panel">
                        <h2 [class]="styles.title">Source</h2>
                        <p [class]="styles.text">
                            Drag the separator, or Tab to it and use the arrows.
                        </p>
                    </section>
                </div>
                <div splitterSeparator aria-label="Resize source" [class]="styles.separator">
                    <span aria-hidden="true" data-testid="readout" [class]="styles.readout">{{
                        label()
                    }}</span>
                </div>
                <div splitterPanel id="preview" minSize="20%">
                    <section aria-label="Preview" [class]="styles.panel">
                        <h2 [class]="styles.title">Preview</h2>
                        <p [class]="styles.text">The badge reads the size of the source panel.</p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class SeparatorSizeReadout {
    protected readonly styles = styles;
    protected readonly splitterRef = createSplitterRef();
    private readonly size = injectSplitterState(
        ({ model }) =>
            model.get("panel-size-by", { panelId: "source" })?.percentage,
        { splitterRef: this.splitterRef },
    );
    protected readonly label = computed(() => {
        const size = this.size();
        return size === undefined ? "" : `${Math.round(size)}%`;
    });
}
