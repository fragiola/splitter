"use client";

import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    validateSplitter,
} from "@fragiola/splitter-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { load, save } from "../_kit/persistence";
import * as styles from "./styles";

const KEY = "fragiola-splitter:persistent-layout";

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// Persistence is the app's, in `_kit/persistence.ts`: the whole layout (both groups, the collapsed
// panel and the size it expands back to) is the model's JSON document, saved on every commit and
// restored by `createSplitterModel(json)` before the first render, so the page never shows the
// default layout first. Resize, collapse the terminal, then reload.
export default function PersistentLayout() {
    const [model] = useState(restore);
    const persist = () => save(KEY, model.get("splitter-json"));
    function reset() {
        for (const group of model.get("groups")) {
            model.run("group.reset", { groupId: group.id });
        }
    }
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <Clickable.Button size="sm" variant="outline" onClick={reset}>
                    Reset the layout
                </Clickable.Button>
                <span className={styles.hint}>
                    Saved in this browser on every change.
                </span>
            </div>
            <Splitter.Group
                id="persistent"
                model={model}
                onLayoutCommit={persist}
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
                <Splitter.Panel id="main">
                    <Splitter.Group
                        id="persistent-main"
                        orientation="vertical"
                        onLayoutCommit={persist}
                        className={styles.nested}
                    >
                        <Splitter.Panel id="editor" minSize="20%">
                            <section
                                aria-label="Editor"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Editor</h2>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize editor"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="terminal"
                            defaultSize="30%"
                            minSize="15%"
                            collapsible
                        >
                            <section
                                aria-label="Terminal"
                                className={styles.panel}
                            >
                                <h2 className={styles.title}>Terminal</h2>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
