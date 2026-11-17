"use client";

import {
    Splitter,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import {
    ChevronRight,
    Database,
    KeyRound,
    PanelBottom,
    Play,
    RotateCcw,
    Table2,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { DATABASE, QUERY, RESULT, TABLES } from "./sample";
import * as styles from "./styles";

/** The tables the tree shows open at first. */
const OPEN = ["customers", "orders"];

// A database console: the schema beside a SQL editor stacked above its results, two groups in one
// model. The schema has a minimum in rem, the editor in pixels. The results collapse to their
// title bar from the toolbar or with Enter on their separator; Run expands them and shows the
// rows (fixed sample rows: there is no SQL engine). Reset puts both groups back to their default
// layout with `group.reset`, in one batch.
export default function DatabaseConsole() {
    const splitterRef = useSplitterRef();
    const splitter = useSplitter(splitterRef);
    // re-renders when the results collapse or expand, however it happens (a drag, Enter, a click)
    const collapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "results" }),
            { splitterRef },
        ) ?? false;
    const [sql, setSql] = useState(QUERY);
    const [ran, setRan] = useState(false);
    const lines = sql.split("\n").length;
    function toggleResults() {
        splitter?.model.run(collapsed ? "panel.expand" : "panel.collapse", {
            panelId: "results",
        });
    }
    function run() {
        if (collapsed) {
            splitter?.model.run("panel.expand", { panelId: "results" });
        }
        setRan(true);
    }
    function reset() {
        splitter?.model.run("batch", {
            commands: [
                { command: "group.reset", payload: { groupId: "console" } },
                { command: "group.reset", payload: { groupId: "query" } },
            ],
        });
    }
    // Ctrl+Enter (⌘+Enter) runs the query from the editor
    function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            run();
        }
    }
    // Enter toggles the panel before a separator (the editor, which does not collapse): the
    // results are after it, so the app toggles them itself (docs/docs-examples-gaps.md, S12)
    function onSeparatorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Enter") toggleResults();
    }
    return (
        <div className={styles.frame}>
            <div role="toolbar" aria-label="Query" className={styles.toolbar}>
                <Clickable.Button
                    size="sm"
                    onClick={run}
                    className={styles.run}
                >
                    <Play aria-hidden="true" />
                    Run
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="ghost"
                    aria-pressed={!collapsed}
                    onClick={toggleResults}
                    className={styles.toggle}
                >
                    <PanelBottom aria-hidden="true" />
                    Results
                </Clickable.Button>
                <Clickable.Button size="sm" variant="ghost" onClick={reset}>
                    <RotateCcw aria-hidden="true" />
                    Reset layout
                </Clickable.Button>
                <span className={styles.connection}>
                    <Database aria-hidden="true" className={styles.db} />
                    {DATABASE} · read-only
                </span>
            </div>
            <Splitter.Group
                id="console"
                splitterRef={splitterRef}
                className={styles.group}
            >
                <Splitter.Panel
                    id="schema"
                    defaultSize="16rem"
                    minSize="12rem"
                    maxSize="40%"
                    groupResizeBehavior="preserve-pixel-size"
                    className={styles.side}
                >
                    <nav aria-label="Schema" className={styles.tree}>
                        <h2 className={styles.caption}>
                            <Database
                                aria-hidden="true"
                                className={styles.db}
                            />
                            {DATABASE}
                        </h2>
                        {TABLES.map((table) => (
                            <details
                                key={table.name}
                                open={OPEN.includes(table.name)}
                            >
                                <summary className={styles.summary}>
                                    <ChevronRight
                                        aria-hidden="true"
                                        className={styles.chevron}
                                    />
                                    <Table2
                                        aria-hidden="true"
                                        className={styles.icon}
                                    />
                                    <span className={styles.table}>
                                        {table.name}
                                    </span>
                                    <span className={styles.rows}>
                                        {table.rows}
                                    </span>
                                </summary>
                                <ul className={styles.columns}>
                                    {table.columns.map((column) => (
                                        <li
                                            key={column.name}
                                            className={styles.column}
                                        >
                                            {column.key ? (
                                                <KeyRound
                                                    aria-hidden="true"
                                                    data-key={column.key}
                                                    className={styles.key}
                                                />
                                            ) : (
                                                <span
                                                    className={styles.spacer}
                                                />
                                            )}
                                            <span className={styles.columnName}>
                                                {column.name}
                                            </span>
                                            <span className={styles.type}>
                                                {column.type}
                                            </span>
                                            {column.key && (
                                                <span className={styles.hidden}>
                                                    , {column.key} key
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ))}
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize schema"
                    className={styles.separator}
                />
                <Splitter.Panel id="workspace" minSize="40%">
                    <Splitter.Group
                        id="query"
                        orientation="vertical"
                        className={styles.nested}
                    >
                        <Splitter.Panel id="editor" minSize={120}>
                            <section
                                aria-label="Editor"
                                className={styles.pane}
                            >
                                <div className={styles.bar}>
                                    <h2 className={styles.tab}>query.sql</h2>
                                    <span className={styles.status}>
                                        Ctrl+Enter to run
                                    </span>
                                </div>
                                <div className={styles.code}>
                                    <pre
                                        aria-hidden="true"
                                        className={styles.gutter}
                                    >
                                        {Array.from(
                                            { length: lines },
                                            (_, i) => i + 1,
                                        ).join("\n")}
                                    </pre>
                                    <textarea
                                        aria-label="SQL"
                                        spellCheck={false}
                                        wrap="off"
                                        rows={lines}
                                        value={sql}
                                        onChange={(event) =>
                                            setSql(event.target.value)
                                        }
                                        onKeyDown={onEditorKeyDown}
                                        className={styles.sql}
                                    />
                                </div>
                            </section>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize results"
                            onKeyDown={onSeparatorKeyDown}
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="results"
                            defaultSize="40%"
                            minSize="7rem"
                            collapsible
                            collapsedSize="2rem"
                        >
                            <section
                                aria-label="Results"
                                className={styles.pane}
                            >
                                <div className={styles.bar}>
                                    <h2 className={styles.tab}>Results</h2>
                                    <span className={styles.status}>
                                        {ran
                                            ? `${RESULT.rows.length} rows · ${RESULT.elapsed}`
                                            : "Not run yet"}
                                    </span>
                                </div>
                                <div className={styles.output}>
                                    {ran ? (
                                        <table className={styles.grid}>
                                            <thead>
                                                <tr>
                                                    {RESULT.columns.map((c) => (
                                                        <th
                                                            key={c.name}
                                                            scope="col"
                                                            data-numeric={
                                                                c.numeric
                                                                    ? ""
                                                                    : undefined
                                                            }
                                                            className={
                                                                styles.head
                                                            }
                                                        >
                                                            {c.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {RESULT.rows.map((row) => (
                                                    <tr
                                                        key={row.country}
                                                        className={styles.row}
                                                    >
                                                        {RESULT.columns.map(
                                                            (c) => (
                                                                <td
                                                                    key={c.name}
                                                                    data-numeric={
                                                                        c.numeric
                                                                            ? ""
                                                                            : undefined
                                                                    }
                                                                    className={
                                                                        styles.cell
                                                                    }
                                                                >
                                                                    {
                                                                        row[
                                                                            c
                                                                                .name
                                                                        ]
                                                                    }
                                                                </td>
                                                            ),
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className={styles.empty}>
                                            Run the query to see its rows.
                                        </p>
                                    )}
                                </div>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
