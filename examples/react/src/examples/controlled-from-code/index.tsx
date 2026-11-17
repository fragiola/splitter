"use client";

import {
    type Layout,
    Splitter,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
} from "@fragiola/splitter-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

/** The layout as the readout shows it: each panel's size, rounded. */
function describe(layout: Readonly<Layout> | undefined) {
    if (!layout) return "…";
    return Object.entries(layout)
        .map(([panelId, size]) => `${panelId} ${Math.round(size)}%`)
        .join(" · ");
}

// Code outside the group drives it through an external ref: `useSplitterRef()` is given to the
// group, and `useSplitter(splitterRef)` hands its model to the toolbar, which runs commands on it.
// The readout follows `onLayoutChange`, drags included.
export default function ControlledFromCode() {
    const splitterRef = useSplitterRef();
    const [layout, setLayout] = useState<Readonly<Layout>>();
    return (
        <div className={styles.frame}>
            <Toolbar splitterRef={splitterRef} />
            <output data-testid="layout" className={styles.readout}>
                {describe(layout)}
            </output>
            <Splitter.Group
                id="editor-layout"
                splitterRef={splitterRef}
                onLayoutChange={setLayout}
                className={styles.group}
            >
                <Splitter.Panel id="sidebar" defaultSize="25%" minSize="10%">
                    <section aria-label="Sidebar" className={styles.panel}>
                        <h2 className={styles.title}>Sidebar</h2>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize sidebar"
                    className={styles.separator}
                />
                <Splitter.Panel id="editor" minSize="30%">
                    <section aria-label="Editor" className={styles.panel}>
                        <h2 className={styles.title}>Editor</h2>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize editor"
                    className={styles.separator}
                />
                <Splitter.Panel
                    id="inspector"
                    defaultSize="25%"
                    minSize="15%"
                    collapsible
                >
                    <section aria-label="Inspector" className={styles.panel}>
                        <h2 className={styles.title}>Inspector</h2>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

/** Buttons that run commands on the group's model: they never touch the DOM. */
function Toolbar({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    if (!splitter) return null;
    const { model, groupId } = splitter;
    return (
        <div className={styles.toolbar}>
            <Clickable.Button
                size="sm"
                variant="outline"
                onClick={() =>
                    model.run("panel.resize", {
                        panelId: "sidebar",
                        size: "20%",
                    })
                }
            >
                Sidebar at 20%
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                onClick={() =>
                    model.run("panel.resize", {
                        panelId: "sidebar",
                        size: "40%",
                    })
                }
            >
                Sidebar at 40%
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                onClick={() =>
                    model.is("panel-collapsed", { panelId: "inspector" })
                        ? model.run("panel.expand", { panelId: "inspector" })
                        : model.run("panel.collapse", { panelId: "inspector" })
                }
            >
                Toggle the inspector
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                onClick={() => model.run("group.reset", { groupId })}
            >
                Reset
            </Clickable.Button>
        </div>
    );
}
