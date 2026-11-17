"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// Three panels side by side. Each declares its default size; each separator carries its own
// accessible name (the package renders none). Drag a separator, or double click it to put the
// panel before it back to its default size.
export default function BasicHorizontal() {
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel id="navigation" defaultSize="25%">
                    <section aria-label="Navigation" className={styles.panel}>
                        <h2 className={styles.title}>Navigation</h2>
                        <p className={styles.text}>25% to start with.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize navigation"
                    className={styles.separator}
                />
                <Splitter.Panel id="content" defaultSize="50%">
                    <section aria-label="Content" className={styles.panel}>
                        <h2 className={styles.title}>Content</h2>
                        <p className={styles.text}>
                            Drag a separator, or double click it to reset its
                            panel.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize content"
                    className={styles.separator}
                />
                <Splitter.Panel id="details" defaultSize="25%">
                    <section aria-label="Details" className={styles.panel}>
                        <h2 className={styles.title}>Details</h2>
                        <p className={styles.text}>25% to start with.</p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
