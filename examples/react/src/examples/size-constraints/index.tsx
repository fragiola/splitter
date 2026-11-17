"use client";

import { type PanelSize, Splitter } from "@fragiola/splitter-react";
import { useState } from "react";
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
export default function SizeConstraints() {
    const [files, setFiles] = useState<PanelSize>();
    const [editor, setEditor] = useState<PanelSize>();
    const [preview, setPreview] = useState<PanelSize>();
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel
                    id="files"
                    defaultSize="12rem"
                    minSize="10rem"
                    maxSize="20rem"
                    onResize={setFiles}
                >
                    <section aria-label="Files" className={styles.panel}>
                        <h2 className={styles.title}>Files</h2>
                        <p className={styles.text}>10rem to 20rem</p>
                        <output
                            data-testid="files-size"
                            className={styles.size}
                        >
                            {describe(files)}
                        </output>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize files"
                    className={styles.separator}
                />
                <Splitter.Panel id="editor" minSize="30%" onResize={setEditor}>
                    <section aria-label="Editor" className={styles.panel}>
                        <h2 className={styles.title}>Editor</h2>
                        <p className={styles.text}>at least 30%</p>
                        <output
                            data-testid="editor-size"
                            className={styles.size}
                        >
                            {describe(editor)}
                        </output>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize editor"
                    className={styles.separator}
                />
                <Splitter.Panel
                    id="preview"
                    defaultSize={200}
                    minSize={120}
                    maxSize={360}
                    onResize={setPreview}
                >
                    <section aria-label="Preview" className={styles.panel}>
                        <h2 className={styles.title}>Preview</h2>
                        <p className={styles.text}>120px to 360px</p>
                        <output
                            data-testid="preview-size"
                            className={styles.size}
                        >
                            {describe(preview)}
                        </output>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
