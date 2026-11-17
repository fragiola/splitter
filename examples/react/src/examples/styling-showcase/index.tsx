"use client";

import { Splitter } from "@fragiola/splitter-react";
import { GripVertical } from "lucide-react";
import * as styles from "./styles";

// Everything the separators look like comes from their state attributes and the theme's tokens:
// a wide hit area with the theme's line and a grip, the cursor from `data-orientation`, the
// colours from hover, `data-dragging` and focus, and the whole group dimmed while one of its
// separators drags (`data-dragging` on the group too). The package writes only the flex sizing.
export default function StylingShowcase() {
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel
                    id="blue"
                    defaultSize="34%"
                    className={styles.blue}
                >
                    <section aria-label="Blue" className={styles.panel}>
                        <h2 className={styles.title}>Blue</h2>
                        <p className={styles.text}>Panels take any palette.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize blue"
                    className={styles.separator}
                >
                    <span className={styles.grip}>
                        <GripVertical
                            aria-hidden="true"
                            className={styles.icon}
                        />
                    </span>
                </Splitter.Separator>
                <Splitter.Panel id="stack">
                    <Splitter.Group
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="green" className={styles.green}>
                            <section
                                aria-label="Green"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Green</h2>
                                <p className={styles.text}>
                                    The grip turns with the separator.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize green"
                            className={styles.separator}
                        >
                            <span className={styles.grip}>
                                <GripVertical
                                    aria-hidden="true"
                                    className={styles.icon}
                                />
                            </span>
                        </Splitter.Separator>
                        <Splitter.Panel id="orange" className={styles.orange}>
                            <section
                                aria-label="Orange"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Orange</h2>
                                <p className={styles.text}>
                                    Hover, drag or focus a separator.
                                </p>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
