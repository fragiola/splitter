"use client";

import {
    Splitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import * as styles from "./styles";

// A badge on the separator shows the size of the panel before it. The size comes from the model
// (`panel-size-by` through `useSplitterState`), so it follows every drag step and every key; the
// badge shows only while the separator is dragged (`data-dragging`) or focused from the keyboard.
// It is hidden from assistive technology: the separator already says its value (`aria-valuenow`).
export default function SeparatorSizeReadout() {
    const splitterRef = useSplitterRef();
    const size = useSplitterState(
        ({ model }) =>
            model.get("panel-size-by", { panelId: "source" })?.percentage,
        { splitterRef },
    );
    return (
        <div className={styles.frame}>
            <Splitter.Group splitterRef={splitterRef} className={styles.group}>
                <Splitter.Panel id="source" defaultSize="50%" minSize="20%">
                    <section aria-label="Source" className={styles.panel}>
                        <h2 className={styles.title}>Source</h2>
                        <p className={styles.text}>
                            Drag the separator, or Tab to it and use the arrows.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize source"
                    className={styles.separator}
                >
                    <span
                        aria-hidden="true"
                        data-testid="readout"
                        className={styles.readout}
                    >
                        {size === undefined ? "" : `${Math.round(size)}%`}
                    </span>
                </Splitter.Separator>
                <Splitter.Panel id="preview" minSize="20%">
                    <section aria-label="Preview" className={styles.panel}>
                        <h2 className={styles.title}>Preview</h2>
                        <p className={styles.text}>
                            The badge reads the size of the source panel.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
