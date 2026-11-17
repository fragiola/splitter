<script setup lang="ts">
import {
    type SplitterRef,
    useSplitter,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { type Component, computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

/** The panels the toolbar collapses and expands. */
type Collapsible = "explorer" | "outline" | "terminal";

const props = defineProps<{
    splitterRef: SplitterRef;
    panelId: Collapsible;
    label: string;
    icon: Component;
}>();

const splitter = useSplitter(props.splitterRef);
// recomputed when the panel collapses or expands, however it happens (a drag, Enter, a button)
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: props.panelId }),
    { splitterRef: props.splitterRef },
);
const collapsed = computed(() => state.value ?? false);

function toggle() {
    splitter.value?.model.run(
        collapsed.value ? "panel.expand" : "panel.collapse",
        { panelId: props.panelId },
    );
}
</script>

<template>
    <Clickable.Button
        size="sm"
        variant="ghost"
        :aria-pressed="!collapsed"
        :class="styles.toggle"
        @click="toggle"
    >
        <component :is="icon" aria-hidden="true" />
        {{ label }}
    </Clickable.Button>
</template>
