"use client";

import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
    useSplitterState,
    validateSplitter,
} from "@fragiola/splitter-react";
import {
    Archive,
    FileText,
    Inbox,
    type LucideIcon,
    PanelLeft,
    Send,
    Star,
} from "lucide-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { load, save } from "../_kit/persistence";
import { FOLDERS, type FolderId, MESSAGES } from "./messages";
import * as styles from "./styles";

const KEY = "fragiola-splitter:email-client";

const ICONS: Record<FolderId, LucideIcon> = {
    inbox: Inbox,
    starred: Star,
    sent: Send,
    drafts: FileText,
    archive: Archive,
};

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// A mail app's three panes. The folders collapse to an icon rail (a `collapsedSize` in rem) by a
// drag or from the toolbar, and hide their labels while collapsed (`in-data-collapsed:`). The
// folders and the message list keep their pixels when the window resizes
// (`preserve-pixel-size`): the reader takes up the change. The layout is the model's JSON
// document, saved on every commit and restored before the first render, as `persistent-layout`.
export default function EmailClient() {
    const [model] = useState(restore);
    const splitterRef = useSplitterRef();
    const [folder, setFolder] = useState<FolderId>("inbox");
    const [selected, setSelected] = useState<string | undefined>("m1");
    const [read, setRead] = useState<string[]>(["m1"]);
    const persist = () => save(KEY, model.get("splitter-json"));
    const unread = (id: FolderId) =>
        MESSAGES.filter(
            (m) => m.folder === id && m.unread && !read.includes(m.id),
        ).length;
    const messages = MESSAGES.filter((m) => m.folder === folder);
    const message = messages.find((m) => m.id === selected);
    function openFolder(id: FolderId) {
        setFolder(id);
        setSelected(MESSAGES.find((m) => m.folder === id)?.id);
    }
    function open(id: string) {
        setSelected(id);
        if (!read.includes(id)) setRead([...read, id]);
    }
    return (
        <div className={styles.frame}>
            <Toolbar splitterRef={splitterRef} />
            <Splitter.Group
                id="mail"
                model={model}
                splitterRef={splitterRef}
                onLayoutCommit={persist}
                className={styles.group}
            >
                <Splitter.Panel
                    id="folders"
                    defaultSize="13rem"
                    minSize="10rem"
                    maxSize="30%"
                    collapsible
                    collapsedSize="3.25rem"
                    groupResizeBehavior="preserve-pixel-size"
                    className={styles.folders}
                >
                    <nav aria-label="Folders" className={styles.nav}>
                        {FOLDERS.map(({ id, label }) => {
                            const Icon = ICONS[id];
                            const count = unread(id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-label={label}
                                    title={label}
                                    aria-current={
                                        id === folder ? "page" : undefined
                                    }
                                    data-active={id === folder ? "" : undefined}
                                    onClick={() => openFolder(id)}
                                    className={styles.folder}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className={styles.icon}
                                    />
                                    <span className={styles.label}>
                                        {label}
                                    </span>
                                    {count > 0 && (
                                        <span
                                            aria-hidden="true"
                                            className={styles.count}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize folders"
                    className={styles.separator}
                />
                <Splitter.Panel
                    id="messages"
                    defaultSize={320}
                    minSize={240}
                    maxSize={440}
                    groupResizeBehavior="preserve-pixel-size"
                    className={styles.list}
                >
                    <section aria-label="Messages" className={styles.pane}>
                        <h2 className={styles.heading}>
                            {FOLDERS.find((f) => f.id === folder)?.label}
                            <span className={styles.total}>
                                {messages.length}
                            </span>
                        </h2>
                        <ul className={styles.messages}>
                            {messages.map((m) => (
                                <li key={m.id}>
                                    <button
                                        type="button"
                                        aria-current={
                                            m.id === selected
                                                ? "true"
                                                : undefined
                                        }
                                        data-active={
                                            m.id === selected ? "" : undefined
                                        }
                                        data-unread={
                                            m.unread && !read.includes(m.id)
                                                ? ""
                                                : undefined
                                        }
                                        onClick={() => open(m.id)}
                                        className={styles.message}
                                    >
                                        <span className={styles.from}>
                                            {m.from}
                                        </span>
                                        <span className={styles.date}>
                                            {m.date}
                                        </span>
                                        <span className={styles.subject}>
                                            {m.subject}
                                        </span>
                                        <span className={styles.snippet}>
                                            {m.body.join(" ")}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize message list"
                    className={styles.separator}
                />
                <Splitter.Panel id="reader" minSize="30%">
                    <article aria-label="Reader" className={styles.reader}>
                        {message ? (
                            <>
                                <header className={styles.header}>
                                    <h2 className={styles.title}>
                                        {message.subject}
                                    </h2>
                                    <p className={styles.meta}>
                                        {message.from} to {message.to} ·{" "}
                                        {message.date}
                                    </p>
                                </header>
                                <div className={styles.body}>
                                    {message.body.map((paragraph) => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className={styles.empty}>No message selected.</p>
                        )}
                    </article>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

/** The toolbar: a toggle that collapses the folders to their rail and expands them back. */
function Toolbar({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    // re-renders when the folders collapse or expand, however it happens (a drag, Enter, a click)
    const collapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "folders" }),
            { splitterRef },
        ) ?? false;
    function toggle() {
        splitter?.model.run(collapsed ? "panel.expand" : "panel.collapse", {
            panelId: "folders",
        });
    }
    return (
        <div role="toolbar" aria-label="Mail" className={styles.toolbar}>
            <Clickable.Button
                size="sm"
                variant="ghost"
                aria-pressed={!collapsed}
                onClick={toggle}
                className={styles.toggle}
            >
                <PanelLeft aria-hidden="true" />
                Folders
            </Clickable.Button>
            <span className={styles.hint}>Layout saved in this browser.</span>
        </div>
    );
}
