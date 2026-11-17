<script setup lang="ts">
import { type SplitterRef, useSplitter } from "@fragiola/splitter-vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// Buttons that run commands on the group's model: they never touch the DOM.
const props = defineProps<{ splitterRef: SplitterRef }>();
const splitter = useSplitter(props.splitterRef);

function resizeSidebar(size: string) {
    splitter.value?.model.run("panel.resize", { panelId: "sidebar", size });
}

function toggleInspector() {
    const model = splitter.value?.model;
    if (!model) return;
    if (model.is("panel-collapsed", { panelId: "inspector" })) {
        model.run("panel.expand", { panelId: "inspector" });
    } else {
        model.run("panel.collapse", { panelId: "inspector" });
    }
}

function reset() {
    const current = splitter.value;
    current?.model.run("group.reset", { groupId: current.groupId });
}
</script>

<template>
    <div v-if="splitter" :class="styles.toolbar">
        <Clickable.Button
            size="sm"
            variant="outline"
            @click="resizeSidebar('20%')"
        >
            Sidebar at 20%
        </Clickable.Button>
        <Clickable.Button
            size="sm"
            variant="outline"
            @click="resizeSidebar('40%')"
        >
            Sidebar at 40%
        </Clickable.Button>
        <Clickable.Button size="sm" variant="outline" @click="toggleInspector">
            Toggle the inspector
        </Clickable.Button>
        <Clickable.Button size="sm" variant="outline" @click="reset">
            Reset
        </Clickable.Button>
    </div>
</template>
