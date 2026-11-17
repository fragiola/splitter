"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

const KEYS = [
    { keys: "← →", does: "resize by 5%" },
    { keys: "Home / End", does: "to the smallest / largest size" },
    { keys: "Enter", does: "collapse or expand the panel before it" },
    { keys: "F6", does: "next separator (Shift+F6: previous)" },
];

// The separators follow the WAI-ARIA Window Splitter pattern: each is focusable, says the size of
// the panel before it (`aria-valuenow`) between its limits (`aria-valuemin`, `aria-valuemax`) and
// names the panel it controls (`aria-controls`). Tab to one and use the keys below.
export default function Keyboard() {
    return (
        <div className={styles.frame}>
            <dl aria-label="Keys" className={styles.keys}>
                {KEYS.map(({ keys, does }) => (
                    <div key={keys} className={styles.key}>
                        <dt className={styles.kbd}>{keys}</dt>
                        <dd>{does}</dd>
                    </div>
                ))}
            </dl>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel
                    id="outline"
                    defaultSize="30%"
                    minSize="15%"
                    maxSize="50%"
                    collapsible
                >
                    <section aria-label="Outline" className={styles.panel}>
                        <h2 className={styles.title}>Outline</h2>
                        <p className={styles.text}>15% to 50%, collapsible.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize outline"
                    className={styles.separator}
                />
                <Splitter.Panel id="document" minSize="30%">
                    <section aria-label="Document" className={styles.panel}>
                        <h2 className={styles.title}>Document</h2>
                        <p className={styles.text}>At least 30%.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize document"
                    className={styles.separator}
                />
                <Splitter.Panel id="comments" defaultSize="25%" minSize="10%">
                    <section aria-label="Comments" className={styles.panel}>
                        <h2 className={styles.title}>Comments</h2>
                        <p className={styles.text}>At least 10%.</p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
