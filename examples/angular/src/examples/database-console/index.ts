import { Component, computed, signal } from "@angular/core";
import {
    createSplitterRef,
    injectSplitter,
    injectSplitterState,
    SPLITTER,
} from "@fragiola/splitter-angular";
import {
    LucideChevronRight,
    LucideDatabase,
    LucideKeyRound,
    LucidePanelBottom,
    LucidePlay,
    LucideRotateCcw,
    LucideTable2,
} from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { DATABASE, QUERY, RESULT, TABLES } from "./sample";
import * as styles from "./styles";

/** The tables the tree shows open at first. */
const OPEN = ["customers", "orders"];

// A database console: the schema beside a SQL editor stacked above its results, two groups in one
// model. The schema has a minimum in rem, the editor in pixels. The results collapse to their
// title bar from the toolbar or with Enter on their separator; Run expands them and shows the
// rows (fixed sample rows: there is no SQL engine). Reset puts both groups back to their default
// layout with `group.reset`, in one batch.
@Component({
    selector: "example-database-console",
    imports: [
        SPLITTER,
        ClickableButton,
        LucideChevronRight,
        LucideDatabase,
        LucideKeyRound,
        LucidePanelBottom,
        LucidePlay,
        LucideRotateCcw,
        LucideTable2,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div role="toolbar" aria-label="Query" [class]="styles.toolbar">
                <button kitClickable size="sm" [class]="styles.run" (click)="run()">
                    <svg lucidePlay aria-hidden="true"></svg>
                    Run
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="ghost"
                    [attr.aria-pressed]="!collapsed()"
                    [class]="styles.toggle"
                    (click)="toggleResults()"
                >
                    <svg lucidePanelBottom aria-hidden="true"></svg>
                    Results
                </button>
                <button kitClickable size="sm" variant="ghost" (click)="reset()">
                    <svg lucideRotateCcw aria-hidden="true"></svg>
                    Reset layout
                </button>
                <span [class]="styles.connection">
                    <svg lucideDatabase aria-hidden="true" [class]="styles.db"></svg>
                    {{ database }} · read-only
                </span>
            </div>
            <div splitterGroup id="console" [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="schema"
                    defaultSize="16rem"
                    minSize="12rem"
                    maxSize="40%"
                    groupResizeBehavior="preserve-pixel-size"
                    [class]="styles.side"
                >
                    <nav aria-label="Schema" [class]="styles.tree">
                        <h2 [class]="styles.caption">
                            <svg lucideDatabase aria-hidden="true" [class]="styles.db"></svg>
                            {{ database }}
                        </h2>
                        @for (table of tables; track table.name) {
                            <details [open]="open.includes(table.name)">
                                <summary [class]="styles.summary">
                                    <svg lucideChevronRight aria-hidden="true" [class]="styles.chevron"></svg>
                                    <svg lucideTable2 aria-hidden="true" [class]="styles.icon"></svg>
                                    <span [class]="styles.table">{{ table.name }}</span>
                                    <span [class]="styles.rows">{{ table.rows }}</span>
                                </summary>
                                <ul [class]="styles.columns">
                                    @for (column of table.columns; track column.name) {
                                        <li [class]="styles.column">
                                            @if (column.key) {
                                                <svg
                                                    lucideKeyRound
                                                    aria-hidden="true"
                                                    [attr.data-key]="column.key"
                                                    [class]="styles.key"
                                                ></svg>
                                            } @else {
                                                <span [class]="styles.spacer"></span>
                                            }
                                            <span [class]="styles.columnName">{{ column.name }}</span>
                                            <span [class]="styles.type">{{ column.type }}</span>
                                            @if (column.key) {
                                                <span [class]="styles.hidden">, {{ column.key }} key</span>
                                            }
                                        </li>
                                    }
                                </ul>
                            </details>
                        }
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize schema"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="workspace" minSize="40%">
                    <div splitterGroup id="query" orientation="vertical" [class]="styles.nested">
                        <div splitterPanel id="editor" [minSize]="120">
                            <section aria-label="Editor" [class]="styles.pane">
                                <div [class]="styles.bar">
                                    <h2 [class]="styles.tab">query.sql</h2>
                                    <span [class]="styles.status">Ctrl+Enter to run</span>
                                </div>
                                <div [class]="styles.code">
                                    <pre aria-hidden="true" [class]="styles.gutter">{{ numbers() }}</pre>
                                    <textarea
                                        aria-label="SQL"
                                        spellcheck="false"
                                        wrap="off"
                                        [rows]="lines()"
                                        [value]="sql()"
                                        [class]="styles.sql"
                                        (input)="edit($event)"
                                        (keydown)="onEditorKeydown($event)"
                                    ></textarea>
                                </div>
                            </section>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize results"
                            [class]="styles.separator"
                            (keydown)="onSeparatorKeydown($event)"
                        ></div>
                        <div
                            splitterPanel
                            id="results"
                            defaultSize="40%"
                            minSize="7rem"
                            collapsible
                            collapsedSize="2rem"
                        >
                            <section aria-label="Results" [class]="styles.pane">
                                <div [class]="styles.bar">
                                    <h2 [class]="styles.tab">Results</h2>
                                    <span [class]="styles.status">
                                        {{ ran() ? result.rows.length + " rows · " + result.elapsed : "Not run yet" }}
                                    </span>
                                </div>
                                <div [class]="styles.output">
                                    @if (ran()) {
                                        <table [class]="styles.grid">
                                            <thead>
                                                <tr>
                                                    @for (c of result.columns; track c.name) {
                                                        <th
                                                            scope="col"
                                                            [attr.data-numeric]="c.numeric ? '' : null"
                                                            [class]="styles.head"
                                                        >
                                                            {{ c.name }}
                                                        </th>
                                                    }
                                                </tr>
                                            </thead>
                                            <tbody>
                                                @for (row of result.rows; track row["country"]) {
                                                    <tr [class]="styles.row">
                                                        @for (c of result.columns; track c.name) {
                                                            <td
                                                                [attr.data-numeric]="c.numeric ? '' : null"
                                                                [class]="styles.cell"
                                                            >
                                                                {{ row[c.name] }}
                                                            </td>
                                                        }
                                                    </tr>
                                                }
                                            </tbody>
                                        </table>
                                    } @else {
                                        <p [class]="styles.empty">Run the query to see its rows.</p>
                                    }
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export default class DatabaseConsole {
    protected readonly styles = styles;
    protected readonly database = DATABASE;
    protected readonly tables = TABLES;
    protected readonly result = RESULT;
    protected readonly open = OPEN;
    protected readonly splitterRef = createSplitterRef();
    private readonly splitter = injectSplitter(() => this.splitterRef);
    // recomputed when the results collapse or expand, however it happens (a drag, Enter, a click)
    private readonly state = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "results" }),
        { splitterRef: () => this.splitterRef },
    );
    protected readonly collapsed = computed(() => this.state() ?? false);
    protected readonly sql = signal(QUERY);
    protected readonly ran = signal(false);
    protected readonly lines = computed(() => this.sql().split("\n").length);
    protected readonly numbers = computed(() =>
        Array.from({ length: this.lines() }, (_, i) => i + 1).join("\n"),
    );

    protected edit(event: Event) {
        this.sql.set((event.target as HTMLTextAreaElement).value);
    }

    protected toggleResults() {
        this.splitter()?.model.run(
            this.collapsed() ? "panel.expand" : "panel.collapse",
            { panelId: "results" },
        );
    }

    protected run() {
        if (this.collapsed()) {
            this.splitter()?.model.run("panel.expand", { panelId: "results" });
        }
        this.ran.set(true);
    }

    protected reset() {
        this.splitter()?.model.run("batch", {
            commands: [
                { command: "group.reset", payload: { groupId: "console" } },
                { command: "group.reset", payload: { groupId: "query" } },
            ],
        });
    }

    // Ctrl+Enter (⌘+Enter) runs the query from the editor
    protected onEditorKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.run();
        }
    }

    // Enter toggles the panel before a separator (the editor, which does not collapse): the
    // results are after it, so the app toggles them itself (docs/docs-examples-gaps.md, S12)
    protected onSeparatorKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") this.toggleResults();
    }
}
