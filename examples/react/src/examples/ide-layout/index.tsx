"use client";

import {
    Splitter,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
} from "@fragiola/splitter-react";
import { FileCode, PanelBottom, PanelLeft, PanelRight } from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { CODE, FILES, OUTLINE, TERMINAL } from "./files";
import * as styles from "./styles";

/** The panels the toolbar collapses and expands. */
type Collapsible = "explorer" | "outline" | "terminal";

// A workbench as an editor lays it out: three groups in one model. The explorer and the outline
// have minimums in rem, the terminal in pixels, and all three collapse; the toolbar toggles them
// through the external ref, and its buttons follow `onCollapse` / `onExpand`.
export default function IdeLayout() {
    const splitterRef = useSplitterRef();
    const [collapsed, setCollapsed] = useState<Record<Collapsible, boolean>>({
        explorer: false,
        outline: false,
        terminal: false,
    });
    const follow = (panelId: Collapsible) => ({
        onCollapse: () => setCollapsed((c) => ({ ...c, [panelId]: true })),
        onExpand: () => setCollapsed((c) => ({ ...c, [panelId]: false })),
    });
    return (
        <div className={styles.frame}>
            <Toolbar splitterRef={splitterRef} collapsed={collapsed} />
            <Splitter.Group
                id="ide"
                splitterRef={splitterRef}
                className={styles.group}
            >
                <Splitter.Panel
                    id="explorer"
                    defaultSize="22%"
                    minSize="10rem"
                    maxSize="40%"
                    collapsible
                    {...follow("explorer")}
                    className={styles.side}
                >
                    <nav aria-label="Explorer" className={styles.pane}>
                        <h2 className={styles.heading}>Explorer</h2>
                        <ul className={styles.list}>
                            {FILES.map((file) => (
                                <li
                                    key={file.path}
                                    data-active={file.active ? "" : undefined}
                                    className={styles.file(file.depth)}
                                >
                                    <FileCode
                                        aria-hidden="true"
                                        className={styles.icon}
                                    />
                                    <span className={styles.name}>
                                        {file.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize explorer"
                    className={styles.separator}
                />
                <Splitter.Panel id="workspace" minSize="30%">
                    <Splitter.Group
                        id="workspace-column"
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="editors" minSize="30%">
                            <Splitter.Group
                                id="editor-row"
                                className={styles.nested}
                            >
                                <Splitter.Panel id="editor" minSize="30%">
                                    <section
                                        aria-label="Editor"
                                        className={styles.editor}
                                    >
                                        <h2 className={styles.tab}>
                                            splitter.tsx
                                        </h2>
                                        <pre className={styles.code}>
                                            {CODE}
                                        </pre>
                                    </section>
                                </Splitter.Panel>
                                <Splitter.Separator
                                    aria-label="Resize editor"
                                    className={styles.separator}
                                />
                                <Splitter.Panel
                                    id="outline"
                                    defaultSize="26%"
                                    minSize="9rem"
                                    collapsible
                                    {...follow("outline")}
                                    className={styles.side}
                                >
                                    <section
                                        aria-label="Outline"
                                        className={styles.pane}
                                    >
                                        <h2 className={styles.heading}>
                                            Outline
                                        </h2>
                                        <ul className={styles.list}>
                                            {OUTLINE.map((symbol) => (
                                                <li
                                                    key={symbol}
                                                    className={styles.symbol}
                                                >
                                                    {symbol}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                </Splitter.Panel>
                            </Splitter.Group>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize editors"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="terminal"
                            defaultSize="30%"
                            minSize={96}
                            collapsible
                            {...follow("terminal")}
                            className={styles.side}
                        >
                            <section
                                aria-label="Terminal"
                                className={styles.pane}
                            >
                                <h2 className={styles.heading}>Terminal</h2>
                                <pre className={styles.code}>{TERMINAL}</pre>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

const TOGGLES: {
    panelId: Collapsible;
    label: string;
    icon: typeof PanelLeft;
}[] = [
    { panelId: "explorer", label: "Explorer", icon: PanelLeft },
    { panelId: "outline", label: "Outline", icon: PanelRight },
    { panelId: "terminal", label: "Terminal", icon: PanelBottom },
];

/** One toggle per collapsible panel: pressed while the panel shows. */
function Toolbar({
    splitterRef,
    collapsed,
}: {
    splitterRef: SplitterRef;
    collapsed: Record<Collapsible, boolean>;
}) {
    const splitter = useSplitter(splitterRef);
    function toggle(panelId: Collapsible) {
        if (!splitter) return;
        if (collapsed[panelId]) {
            splitter.model.run("panel.expand", { panelId });
        } else {
            splitter.model.run("panel.collapse", { panelId });
        }
    }
    return (
        <div role="toolbar" aria-label="Panels" className={styles.toolbar}>
            {TOGGLES.map(({ panelId, label, icon: Icon }) => (
                <Clickable.Button
                    key={panelId}
                    size="sm"
                    variant="ghost"
                    aria-pressed={!collapsed[panelId]}
                    onClick={() => toggle(panelId)}
                    className={styles.toggle}
                >
                    <Icon aria-hidden="true" />
                    {label}
                </Clickable.Button>
            ))}
        </div>
    );
}
