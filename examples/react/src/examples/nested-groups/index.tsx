"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

// A group inside a panel nests in it: it joins the outer group's model (one
// `model.get("splitter-json")` saves both) and its path starts with that panel's (`/g0/p1/g0`).
// Each separator resizes its own group only.
export default function NestedGroups() {
    return (
        <div className={styles.frame}>
            <Splitter.Group id="workbench" className={styles.group}>
                <Splitter.Panel id="sidebar" defaultSize="28%" minSize="15%">
                    <section aria-label="Sidebar" className={styles.panel}>
                        <h2 className={styles.title}>Sidebar</h2>
                        <p className={styles.text}>The outer group.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize sidebar"
                    className={styles.separator}
                />
                <Splitter.Panel id="main">
                    <Splitter.Group
                        id="main-column"
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="editor" defaultSize="65%">
                            <section
                                aria-label="Editor"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Editor</h2>
                                <p className={styles.text}>
                                    A vertical group nested in the main panel.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize editor"
                            className={styles.separator}
                        />
                        <Splitter.Panel id="terminal">
                            <section
                                aria-label="Terminal"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Terminal</h2>
                                <p className={styles.text}>
                                    Its separator moves the editor and the
                                    terminal only.
                                </p>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
