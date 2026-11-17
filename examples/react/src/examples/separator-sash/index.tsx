"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// A code editor's sash. The separator is 1px (what the engine measures) and its `::before` is a
// 9px hit area that never changes. Its `::after` is what you see: a 1px line at rest that, after
// the pointer rests on it for a moment (a `transition-delay`), while `data-dragging` and on focus,
// grows to 4px in the accent colour.
export default function SeparatorSash() {
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel id="explorer" defaultSize="28%" minSize="15%">
                    <section aria-label="Explorer" className={styles.panel}>
                        <h2 className={styles.title}>Explorer</h2>
                        <p className={styles.text}>
                            Rest the pointer on a line: it thickens after a
                            moment.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize explorer"
                    className={styles.separator}
                />
                <Splitter.Panel id="work">
                    <Splitter.Group
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="editor" minSize="20%">
                            <section
                                aria-label="Editor"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Editor</h2>
                                <p className={styles.text}>
                                    Dragging shows the sash at once.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize editor"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="terminal"
                            defaultSize="35%"
                            minSize="15%"
                        >
                            <section
                                aria-label="Terminal"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Terminal</h2>
                                <p className={styles.text}>
                                    The hit area stays the same in every state.
                                </p>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
