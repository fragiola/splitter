<script setup lang="ts">
import {
    type SplitterRef,
    useSplitter,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { PanelLeft } from "@lucide/vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// The toolbar: a toggle that collapses the folders to their rail and expands them back.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(() => props.splitterRef);
// recomputed when the folders collapse or expand, however it happens (a drag, Enter, a click)
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "folders" }),
    { splitterRef: () => props.splitterRef },
);
const collapsed = computed(() => state.value ?? false);

function toggle() {
    splitter.value?.model.run(
        collapsed.value ? "panel.expand" : "panel.collapse",
        { panelId: "folders" },
    );
}
</script>

<template>
    <div role="toolbar" aria-label="Mail" :class="styles.toolbar">
        <Clickable.Button
            size="sm"
            variant="ghost"
            :aria-pressed="!collapsed"
            :class="styles.toggle"
            @click="toggle"
        >
            <PanelLeft aria-hidden="true" />
            Folders
        </Clickable.Button>
        <span :class="styles.hint">Layout saved in this browser.</span>
    </div>
</template>
