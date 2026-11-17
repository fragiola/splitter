"use client";

import { Splitter } from "@fragiola/splitter-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// When the group itself resizes (the window, a container), a panel keeps its share by default
// (`preserve-relative-size`). The sidebar here keeps its width in pixels instead
// (`preserve-pixel-size`): the editor takes up the whole change. Narrow the group to see it.
export default function FixedSizePanels() {
    const [narrow, setNarrow] = useState(false);
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    aria-pressed={narrow}
                    onClick={() => setNarrow(!narrow)}
                >
                    Narrow the group
                </Clickable.Button>
            </div>
            <div className={styles.stage(narrow)}>
                <Splitter.Group className={styles.group}>
                    <Splitter.Panel
                        id="sidebar"
                        defaultSize={220}
                        minSize={140}
                        groupResizeBehavior="preserve-pixel-size"
                    >
                        <section aria-label="Sidebar" className={styles.panel}>
                            <h2 className={styles.title}>Sidebar</h2>
                            <p className={styles.text}>
                                Keeps its pixels when the group resizes.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize sidebar"
                        className={styles.separator}
                    />
                    <Splitter.Panel id="editor" minSize="20%">
                        <section aria-label="Editor" className={styles.panel}>
                            <h2 className={styles.title}>Editor</h2>
                            <p className={styles.text}>Takes up the change.</p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </div>
        </div>
    );
}
