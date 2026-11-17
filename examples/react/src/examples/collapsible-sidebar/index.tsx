"use client";

import {
    Splitter,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import { FileText, Folder, Search, Settings } from "lucide-react";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

const ITEMS = [
    { label: "Files", icon: Folder },
    { label: "Search", icon: Search },
    { label: "Notes", icon: FileText },
    { label: "Settings", icon: Settings },
];

// A collapsible panel collapses when a drag takes it past half its minimum, down to its collapsed
// size (a rail of 3rem here), and remembers the size it had: dragging it back, Enter on the
// separator or `panel.expand` restores it. The sidebar shows its labels only while expanded,
// styled from its `data-collapsed`. The toolbar outside the group follows the panel with
// `useSplitterState`.
export default function CollapsibleSidebar() {
    const splitterRef = useSplitterRef();
    return (
        <div className={styles.frame}>
            <Toolbar splitterRef={splitterRef} />
            <Splitter.Group splitterRef={splitterRef} className={styles.group}>
                <Splitter.Panel
                    id="sidebar"
                    defaultSize="25%"
                    minSize="10rem"
                    collapsible
                    collapsedSize="3rem"
                    className={styles.sidebar}
                >
                    <nav aria-label="Sidebar" className={styles.nav}>
                        {ITEMS.map(({ label, icon: Icon }) => (
                            <a
                                key={label}
                                href={`#${label.toLowerCase()}`}
                                aria-label={label}
                                className={styles.item}
                            >
                                <Icon
                                    aria-hidden="true"
                                    className={styles.icon}
                                />
                                <span className={styles.label}>{label}</span>
                            </a>
                        ))}
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize sidebar"
                    className={styles.separator}
                />
                <Splitter.Panel id="main">
                    <section aria-label="Document" className={styles.panel}>
                        <h2 className={styles.title}>Document</h2>
                        <p className={styles.text}>
                            Drag the sidebar narrower than 10rem to collapse it.
                        </p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

/** A button outside the group: it collapses and expands the sidebar through the model. */
function Toolbar({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    // undefined until the group holds the ref, then re-rendered on every collapse and expand
    const collapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "sidebar" }),
            { splitterRef },
        ) ?? false;
    function toggle() {
        if (!splitter) return;
        if (collapsed) {
            splitter.model.run("panel.expand", { panelId: "sidebar" });
        } else {
            splitter.model.run("panel.collapse", { panelId: "sidebar" });
        }
    }
    return (
        <div className={styles.toolbar}>
            <Clickable.Button size="sm" variant="outline" onClick={toggle}>
                {collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
            </Clickable.Button>
        </div>
    );
}
