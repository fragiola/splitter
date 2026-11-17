<script setup lang="ts">
import {
    type BatchEntry,
    type SplitterRef,
    useSplitter,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

type ViewMode = "editor" | "split" | "preview";

const MODES: { mode: ViewMode; label: string }[] = [
    { mode: "editor", label: "Editor" },
    { mode: "split", label: "Split" },
    { mode: "preview", label: "Preview" },
];

/** The two panes, in the order the batch expands them. */
const PANES = ["editor", "preview"] as const;

type Pane = (typeof PANES)[number];

// The segmented control: one pressed button, the mode the model is in.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(() => props.splitterRef);
// recomputed when a pane collapses or expands, however it happens (a button, a drag, Enter)
const state = useSplitterState(
    ({ model }): ViewMode =>
        model.is("panel-collapsed", { panelId: "editor" })
            ? "preview"
            : model.is("panel-collapsed", { panelId: "preview" })
              ? "editor"
              : "split",
    { splitterRef: () => props.splitterRef },
);
const current = computed(() => state.value ?? "split");

function show(mode: ViewMode) {
    const model = splitter.value?.model;
    if (!model) return;
    const shown = (panelId: Pane) => mode === "split" || mode === panelId;
    const collapsed = (panelId: Pane) =>
        model.is("panel-collapsed", { panelId });
    // one atomic step: expand what the mode shows, then collapse what it hides
    const commands: BatchEntry[] = [
        ...PANES.filter((p) => shown(p) && collapsed(p)).map((panelId) => ({
            command: "panel.expand" as const,
            payload: { panelId },
        })),
        ...PANES.filter((p) => !shown(p) && !collapsed(p)).map((panelId) => ({
            command: "panel.collapse" as const,
            payload: { panelId },
        })),
    ];
    if (commands.length > 0) model.run("batch", { commands });
}
</script>

<template>
    <fieldset aria-label="Mode" :class="styles.modes">
        <Clickable.Button
            v-for="{ mode, label } in MODES"
            :key="mode"
            size="sm"
            variant="ghost"
            :aria-pressed="current === mode"
            :class="styles.mode"
            @click="show(mode)"
        >
            {{ label }}
        </Clickable.Button>
    </fieldset>
</template>
