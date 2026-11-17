"use client";

import { Splitter } from "@fragiola/splitter-react";
import { GripHorizontal } from "lucide-react";
import * as styles from "./styles";

// A drawer at the bottom of a vertical group. The separator is a thin line with a tab sticking
// out of it, like a drawer's pull: the tab is the separator's content, so it drags the drawer
// up and down, and the arrows move it once the separator has focus.
export default function SeparatorDrawerTab() {
    return (
        <div className={styles.frame}>
            <Splitter.Group orientation="vertical" className={styles.group}>
                <Splitter.Panel id="canvas" minSize="25%">
                    <section aria-label="Canvas" className={styles.panel}>
                        <h2 className={styles.title}>Canvas</h2>
                        <p className={styles.text}>
                            Pull the tab up to open the drawer further.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize drawer"
                    className={styles.separator}
                >
                    <span data-testid="drawer-tab" className={styles.tab}>
                        <GripHorizontal
                            aria-hidden="true"
                            className={styles.icon}
                        />
                    </span>
                </Splitter.Separator>
                <Splitter.Panel
                    id="drawer"
                    defaultSize="35%"
                    minSize="15%"
                    maxSize="70%"
                >
                    <section aria-label="Drawer" className={styles.drawer}>
                        <h2 className={styles.title}>Drawer</h2>
                        <p className={styles.text}>
                            Tab to the separator, then use the up and down
                            arrows.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
