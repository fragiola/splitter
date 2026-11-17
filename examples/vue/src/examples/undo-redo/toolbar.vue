<script setup lang="ts">
import { type SplitterRef, useSplitter } from "@fragiola/splitter-vue";
import { Redo2, Undo2 } from "@lucide/vue";
import { computed, watchEffect } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { undoKey } from "../_kit/undo";
import * as styles from "./styles";
import { useUndoHistory } from "./use-undo-history";

const VERBS: Record<string, string> = {
    "separator.move": "Move a separator",
    "panel.resize": "Resize a panel",
    "panel.collapse": "Collapse a panel",
    "panel.expand": "Expand a panel",
    "group.set-layout": "Set a layout",
    "group.reset": "Reset a layout",
};

// Undo, redo, and the steps they go through.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(() => props.splitterRef);
const { history, snapshot } = useUndoHistory(splitter);

// the shortcuts, page-wide; never in the middle of a drag (its steps are not committed)
watchEffect((onCleanup) => {
    const made = history.value;
    const engine = splitter.value?.engine;
    if (!made || !engine) return;
    const onKeyDown = (event: KeyboardEvent) => {
        const action = undoKey(event);
        if (!action || engine.get("dragging-separator-id")) return;
        event.preventDefault();
        made[action]();
    };
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
});

const steps = computed(() => [
    ...snapshot.value.undoSteps.map((command) => ({ command, undone: false })),
    // undone steps after the done ones, the next to redo first
    ...[...snapshot.value.redoSteps]
        .reverse()
        .map((command) => ({ command, undone: true })),
]);
</script>

<template>
    <div :class="styles.toolbar">
        <div :class="styles.buttons">
            <Clickable.Button
                size="sm"
                variant="outline"
                :disabled="!snapshot.canUndo"
                aria-keyshortcuts="Control+Z Meta+Z"
                @click="history?.undo()"
            >
                <Undo2 aria-hidden="true" />
                Undo
            </Clickable.Button>
            <Clickable.Button
                size="sm"
                variant="outline"
                :disabled="!snapshot.canRedo"
                aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                @click="history?.redo()"
            >
                <Redo2 aria-hidden="true" />
                Redo
            </Clickable.Button>
        </div>
        <ol aria-label="History" :class="styles.history">
            <li v-if="steps.length === 0" :class="styles.hint">
                Each drag, key press or collapse is a step.
            </li>
            <li
                v-for="({ command, undone }, index) in steps"
                :key="index"
                :data-undone="undone ? '' : undefined"
                :class="styles.step"
            >
                {{ VERBS[command] ?? command }}
            </li>
        </ol>
    </div>
</template>
