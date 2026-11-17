"use client";

import {
    Splitter,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import { ChevronLeft } from "lucide-react";
import type { SyntheticEvent } from "react";
import * as styles from "./styles";

/** Keeps a press, a key or a double click on the button from reaching the separator. */
function stop(event: SyntheticEvent) {
    event.stopPropagation();
}

// A button on the separator collapses and expands the panel before it through the model
// (`panel.collapse`, `panel.expand`); its icon turns from the panel's `data-collapsed`, its name
// follows `useSplitterState`. Content inside a separator can keep its events from the separator: in
// React its capture handlers stop them, so pressing the button never starts a drag, its keys never
// move the separator, and a double click on it never resets the layout.
export default function SeparatorCollapseButton() {
    const splitterRef = useSplitterRef();
    const splitter = useSplitter(splitterRef);
    const collapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "outline" }),
            { splitterRef },
        ) ?? false;
    function toggle() {
        const model = splitter?.model;
        if (!model) return;
        if (collapsed) model.run("panel.expand", { panelId: "outline" });
        else model.run("panel.collapse", { panelId: "outline" });
    }
    return (
        <div className={styles.frame}>
            <Splitter.Group splitterRef={splitterRef} className={styles.group}>
                <Splitter.Panel
                    id="outline"
                    defaultSize="30%"
                    minSize="10rem"
                    collapsible
                >
                    <section aria-label="Outline" className={styles.side}>
                        <h2 className={styles.title}>Outline</h2>
                        <p className={styles.text}>
                            Use the button on the separator to hide this panel.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize outline"
                    className={styles.separator}
                >
                    <button
                        type="button"
                        aria-label={
                            collapsed
                                ? "Expand the outline"
                                : "Collapse the outline"
                        }
                        aria-controls="outline"
                        aria-expanded={!collapsed}
                        onClick={toggle}
                        onPointerDownCapture={stop}
                        onKeyDownCapture={stop}
                        onDoubleClickCapture={stop}
                        className={styles.toggle}
                    >
                        <ChevronLeft
                            aria-hidden="true"
                            className={styles.icon}
                        />
                    </button>
                </Splitter.Separator>
                <Splitter.Panel id="page">
                    <section aria-label="Page" className={styles.panel}>
                        <h2 className={styles.title}>Page</h2>
                        <p className={styles.text}>
                            The separator still drags, and Enter on it still
                            collapses the outline.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
