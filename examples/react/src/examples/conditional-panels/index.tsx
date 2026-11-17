"use client";

import { Splitter } from "@fragiola/splitter-react";
import { useId, useState } from "react";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Panels rendered conditionally: each takes its place from its position in the markup, never
// from when it mounts, so the inspector shown again lands at the end. A separator goes with the
// panel it belongs to. The group gives the panels that stay the room a hidden one leaves, and
// takes it back for one that comes back.
export default function ConditionalPanels() {
    const [sidebar, setSidebar] = useState(true);
    const [inspector, setInspector] = useState(true);
    const sidebarLabel = useId();
    const inspectorLabel = useId();
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.toggle}>
                    <Switch.Root
                        aria-labelledby={sidebarLabel}
                        checked={sidebar}
                        onCheckedChange={setSidebar}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={sidebarLabel}>Sidebar</span>
                </span>
                <span className={styles.toggle}>
                    <Switch.Root
                        aria-labelledby={inspectorLabel}
                        checked={inspector}
                        onCheckedChange={setInspector}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={inspectorLabel}>Inspector</span>
                </span>
            </div>
            <Splitter.Group className={styles.group}>
                {sidebar && (
                    <>
                        <Splitter.Panel
                            id="sidebar"
                            defaultSize="25%"
                            minSize="10%"
                        >
                            <section
                                aria-label="Sidebar"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Sidebar</h2>
                                <p className={styles.text}>
                                    Rendered while its switch is on.
                                </p>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize sidebar"
                            className={styles.separator}
                        />
                    </>
                )}
                <Splitter.Panel id="editor" minSize="20%">
                    <section aria-label="Editor" className={styles.panel}>
                        <h2 className={styles.title}>Editor</h2>
                        <p className={styles.text}>Always rendered.</p>
                    </section>
                </Splitter.Panel>
                {inspector && (
                    <>
                        <Splitter.Separator
                            aria-label="Resize inspector"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="inspector"
                            defaultSize="25%"
                            minSize="10%"
                        >
                            <section
                                aria-label="Inspector"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Inspector</h2>
                                <p className={styles.text}>
                                    Comes back at the end, where the markup puts
                                    it.
                                </p>
                            </section>
                        </Splitter.Panel>
                    </>
                )}
            </Splitter.Group>
        </div>
    );
}
