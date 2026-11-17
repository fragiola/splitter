<script setup lang="ts">
import {
    type SplitterRef,
    useSplitter,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { MessagesSquare, Users } from "@lucide/vue";
import { computed } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// The header: the workspace, and a toggle that collapses the member list and expands it back.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(() => props.splitterRef);
// recomputed when the members collapse or expand, however it happens (a drag, Enter, a click)
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "members" }),
    { splitterRef: () => props.splitterRef },
);
const collapsed = computed(() => state.value ?? false);

function toggle() {
    splitter.value?.model.run(
        collapsed.value ? "panel.expand" : "panel.collapse",
        { panelId: "members" },
    );
}
</script>

<template>
    <div role="toolbar" aria-label="Chat" :class="styles.toolbar">
        <span :class="styles.workspace">
            <MessagesSquare aria-hidden="true" :class="styles.logo" />
            Product team
        </span>
        <Clickable.Button
            size="sm"
            variant="ghost"
            :aria-pressed="!collapsed"
            :class="styles.toggle"
            @click="toggle"
        >
            <Users aria-hidden="true" />
            Members
        </Clickable.Button>
    </div>
</template>
