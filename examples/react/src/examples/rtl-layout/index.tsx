"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// The group follows the inline direction it inherits: under `dir="rtl"` its first panel starts at
// the right. A drag toward the start (right) shrinks the panel before the separator, and so does
// the arrow pointing that way: RTL is a mirror, not a separate layout. Sides in the styles are
// logical (`ps-`, `border-s-`), so nothing else changes.
export default function RtlLayout() {
    return (
        <div dir="rtl" lang="ar" className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel id="folders" defaultSize="25%" minSize="15%">
                    <section aria-label="Folders" className={styles.panel}>
                        <h2 className={styles.title}>المجلدات</h2>
                        <p className={styles.text}>
                            The first panel, at the right.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize folders"
                    className={styles.separator}
                />
                <Splitter.Panel id="messages" defaultSize="35%" minSize="20%">
                    <section aria-label="Messages" className={styles.panel}>
                        <h2 className={styles.title}>الرسائل</h2>
                        <p className={styles.text}>
                            ← grows the panel before the separator.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize messages"
                    className={styles.separator}
                />
                <Splitter.Panel id="reading" minSize="20%">
                    <section aria-label="Reading pane" className={styles.panel}>
                        <h2 className={styles.title}>القراءة</h2>
                        <p className={styles.text}>
                            The last panel, at the left.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
