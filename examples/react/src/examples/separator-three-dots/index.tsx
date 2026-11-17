"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// Three dots in the middle of each separator. They line up along it, read from its own
// `data-orientation`: a column between side by side panels, a row between stacked ones. Hover,
// `data-dragging` and focus light them. The dots are the separator's content, so they take the
// pointer like the rest of it.
export default function SeparatorThreeDots() {
    return (
        <div className={styles.frame}>
            <Splitter.Group className={styles.group}>
                <Splitter.Panel id="inbox" defaultSize="35%" minSize="15%">
                    <section aria-label="Inbox" className={styles.panel}>
                        <h2 className={styles.title}>Inbox</h2>
                        <p className={styles.text}>
                            The dots stand in a column here.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize inbox"
                    className={styles.separator}
                >
                    <span data-testid="grip" className={styles.grip}>
                        <span data-testid="dot" className={styles.dot} />
                        <span data-testid="dot" className={styles.dot} />
                        <span data-testid="dot" className={styles.dot} />
                    </span>
                </Splitter.Separator>
                <Splitter.Panel id="message">
                    <Splitter.Group
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="reader" minSize="20%">
                            <section
                                aria-label="Reader"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Reader</h2>
                                <p className={styles.text}>
                                    Below, they turn into a row.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize reader"
                            className={styles.separator}
                        >
                            <span data-testid="grip" className={styles.grip}>
                                <span
                                    data-testid="dot"
                                    className={styles.dot}
                                />
                                <span
                                    data-testid="dot"
                                    className={styles.dot}
                                />
                                <span
                                    data-testid="dot"
                                    className={styles.dot}
                                />
                            </span>
                        </Splitter.Separator>
                        <Splitter.Panel
                            id="reply"
                            defaultSize="35%"
                            minSize="15%"
                        >
                            <section
                                aria-label="Reply"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Reply</h2>
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
