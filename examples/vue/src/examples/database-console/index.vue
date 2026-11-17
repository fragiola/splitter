<script setup lang="ts">
import {
    Splitter,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-vue";
import {
    ChevronRight,
    Database,
    KeyRound,
    PanelBottom,
    Play,
    RotateCcw,
    Table2,
} from "@lucide/vue";
import { computed, ref } from "vue";
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
const splitterRef = useSplitterRef();
const splitter = useSplitter(splitterRef);
// recomputed when the results collapse or expand, however it happens (a drag, Enter, a click)
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "results" }),
    { splitterRef },
);
const collapsed = computed(() => state.value ?? false);
const sql = ref(QUERY);
const ran = ref(false);
const lines = computed(() => sql.value.split("\n").length);
const numbers = computed(() =>
    Array.from({ length: lines.value }, (_, i) => i + 1).join("\n"),
);

function toggleResults() {
    splitter.value?.model.run(
        collapsed.value ? "panel.expand" : "panel.collapse",
        { panelId: "results" },
    );
}

function run() {
    if (collapsed.value) {
        splitter.value?.model.run("panel.expand", { panelId: "results" });
    }
    ran.value = true;
}

function reset() {
    splitter.value?.model.run("batch", {
        commands: [
            { command: "group.reset", payload: { groupId: "console" } },
            { command: "group.reset", payload: { groupId: "query" } },
        ],
    });
}

// Ctrl+Enter (⌘+Enter) runs the query from the editor
function onEditorKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        run();
    }
}

// Enter toggles the panel before a separator (the editor, which does not collapse): the
// results are after it, so the app toggles them itself (docs/docs-examples-gaps.md, S12)
function onSeparatorKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") toggleResults();
}
</script>

<template>
    <div :class="styles.frame">
        <div role="toolbar" aria-label="Query" :class="styles.toolbar">
            <Clickable.Button size="sm" :class="styles.run" @click="run">
                <Play aria-hidden="true" />
                Run
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="ghost"
                :aria-pressed="!collapsed"
                :class="styles.toggle"
                @click="toggleResults"
            >
                <PanelBottom aria-hidden="true" />
                Results
            </Clickable.Button>
            <Clickable.Button size="sm" variant="ghost" @click="reset">
                <RotateCcw aria-hidden="true" />
                Reset layout
            </Clickable.Button>
            <span :class="styles.connection">
                <Database aria-hidden="true" :class="styles.db" />
                {{ DATABASE }} · read-only
            </span>
        </div>
        <Splitter.Group id="console" :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel
                id="schema"
                default-size="16rem"
                min-size="12rem"
                max-size="40%"
                group-resize-behavior="preserve-pixel-size"
                :class="styles.side"
            >
                <nav aria-label="Schema" :class="styles.tree">
                    <h2 :class="styles.caption">
                        <Database aria-hidden="true" :class="styles.db" />
                        {{ DATABASE }}
                    </h2>
                    <details
                        v-for="table in TABLES"
                        :key="table.name"
                        :open="OPEN.includes(table.name)"
                    >
                        <summary :class="styles.summary">
                            <ChevronRight aria-hidden="true" :class="styles.chevron" />
                            <Table2 aria-hidden="true" :class="styles.icon" />
                            <span :class="styles.table">{{ table.name }}</span>
                            <span :class="styles.rows">{{ table.rows }}</span>
                        </summary>
                        <ul :class="styles.columns">
                            <li
                                v-for="column in table.columns"
                                :key="column.name"
                                :class="styles.column"
                            >
                                <KeyRound
                                    v-if="column.key"
                                    aria-hidden="true"
                                    :data-key="column.key"
                                    :class="styles.key"
                                />
                                <span v-else :class="styles.spacer" />
                                <span :class="styles.columnName">{{ column.name }}</span>
                                <span :class="styles.type">{{ column.type }}</span>
                                <span v-if="column.key" :class="styles.hidden">
                                    , {{ column.key }} key
                                </span>
                            </li>
                        </ul>
                    </details>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize schema"
                :class="styles.separator"
            />
            <Splitter.Panel id="workspace" min-size="40%">
                <Splitter.Group id="query" orientation="vertical" :class="styles.nested">
                    <Splitter.Panel id="editor" :min-size="120">
                        <section aria-label="Editor" :class="styles.pane">
                            <div :class="styles.bar">
                                <h2 :class="styles.tab">query.sql</h2>
                                <span :class="styles.status">Ctrl+Enter to run</span>
                            </div>
                            <div :class="styles.code">
                                <pre aria-hidden="true" :class="styles.gutter">{{ numbers }}</pre>
                                <textarea
                                    v-model="sql"
                                    aria-label="SQL"
                                    spellcheck="false"
                                    wrap="off"
                                    :rows="lines"
                                    :class="styles.sql"
                                    @keydown="onEditorKeydown"
                                />
                            </div>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize results"
                        :class="styles.separator"
                        @keydown="onSeparatorKeydown"
                    />
                    <Splitter.Panel
                        id="results"
                        default-size="40%"
                        min-size="7rem"
                        collapsible
                        collapsed-size="2rem"
                    >
                        <section aria-label="Results" :class="styles.pane">
                            <div :class="styles.bar">
                                <h2 :class="styles.tab">Results</h2>
                                <span :class="styles.status">
                                    {{ ran ? `${RESULT.rows.length} rows · ${RESULT.elapsed}` : "Not run yet" }}
                                </span>
                            </div>
                            <div :class="styles.output">
                                <table v-if="ran" :class="styles.grid">
                                    <thead>
                                        <tr>
                                            <th
                                                v-for="c in RESULT.columns"
                                                :key="c.name"
                                                scope="col"
                                                :data-numeric="c.numeric ? '' : undefined"
                                                :class="styles.head"
                                            >
                                                {{ c.name }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="row in RESULT.rows"
                                            :key="row.country"
                                            :class="styles.row"
                                        >
                                            <td
                                                v-for="c in RESULT.columns"
                                                :key="c.name"
                                                :data-numeric="c.numeric ? '' : undefined"
                                                :class="styles.cell"
                                            >
                                                {{ row[c.name] }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p v-else :class="styles.empty">
                                    Run the query to see its rows.
                                </p>
                            </div>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
