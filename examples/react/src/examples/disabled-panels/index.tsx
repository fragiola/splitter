"use client";

import { Splitter } from "@fragiola/splitter-react";
import { useId, useState } from "react";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Three ways to keep a layout still. A disabled panel (the toolbox) is never moved by a
// separator, so the one beside it cannot move. A disabled separator (between the layers and the
// properties) is out of the tab order and ignores the pointer. A disabled group locks every
// separator. Code can still resize them all (`panel.resize`).
export default function DisabledPanels() {
    const [locked, setLocked] = useState(false);
    const lockLabel = useId();
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <span className={styles.toggle}>
                    <Switch.Root
                        aria-labelledby={lockLabel}
                        checked={locked}
                        onCheckedChange={setLocked}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={lockLabel}>Lock the layout</span>
                </span>
            </div>
            <Splitter.Group disabled={locked} className={styles.group}>
                <Splitter.Panel id="toolbox" defaultSize="18%" disabled>
                    <section aria-label="Toolbox" className={styles.panel}>
                        <h2 className={styles.title}>Toolbox</h2>
                        <p className={styles.text}>A disabled panel.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize toolbox"
                    className={styles.separator}
                />
                <Splitter.Panel id="canvas" minSize="20%">
                    <section aria-label="Canvas" className={styles.panel}>
                        <h2 className={styles.title}>Canvas</h2>
                        <p className={styles.text}>
                            Its separator with the layers moves.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize canvas"
                    className={styles.separator}
                />
                <Splitter.Panel id="layers" defaultSize="22%" minSize="10%">
                    <section aria-label="Layers" className={styles.panel}>
                        <h2 className={styles.title}>Layers</h2>
                        <p className={styles.text}>
                            Resizable from the canvas.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    disabled
                    aria-label="Resize layers"
                    className={styles.separator}
                />
                <Splitter.Panel id="properties" defaultSize="22%">
                    <section aria-label="Properties" className={styles.panel}>
                        <h2 className={styles.title}>Properties</h2>
                        <p className={styles.text}>
                            Behind a disabled separator.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
