<script setup lang="ts">
import {
    type SplitterRef,
    useSplitter,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// A button outside the group: it collapses and expands the sidebar through the model.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(() => props.splitterRef);
// undefined until the group holds the ref, then recomputed on every collapse and expand
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "sidebar" }),
    { splitterRef: () => props.splitterRef },
);
const collapsed = computed(() => state.value ?? false);

function toggle() {
    const model = splitter.value?.model;
    if (!model) return;
    if (collapsed.value) {
        model.run("panel.expand", { panelId: "sidebar" });
    } else {
        model.run("panel.collapse", { panelId: "sidebar" });
    }
}
</script>

<template>
    <div :class="styles.toolbar">
        <Clickable.Button size="sm" variant="outline" @click="toggle">
            {{ collapsed ? "Expand the sidebar" : "Collapse the sidebar" }}
        </Clickable.Button>
    </div>
</template>
