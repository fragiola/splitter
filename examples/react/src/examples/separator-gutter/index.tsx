"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// Panels drawn as cards on a canvas. The gap between two cards is the separator: transparent at
// rest, so only the canvas shows, it draws a line on hover, while `data-dragging` and on focus.
export default function SeparatorGutter() {
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel
                    id="tasks"
                    defaultSize="40%"
                    minSize="20%"
                    className={styles.card}
                >
                    <section aria-label="Tasks" className={styles.panel}>
                        <h2 className={styles.title}>Tasks</h2>
                        <p className={styles.text}>
                            The gap between the cards is the separator.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize tasks"
                    className={styles.separator}
                />
                <Splitter.Panel id="details">
                    <Splitter.Group
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel
                            id="summary"
                            minSize="20%"
                            className={styles.card}
                        >
                            <section
                                aria-label="Summary"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Summary</h2>
                                <p className={styles.text}>
                                    Hover a gap to see its line.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize summary"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="activity"
                            defaultSize="40%"
                            minSize="20%"
                            className={styles.card}
                        >
                            <section
                                aria-label="Activity"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Activity</h2>
                                <p className={styles.text}>
                                    Tab to a gap: focus draws it too.
                                </p>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
