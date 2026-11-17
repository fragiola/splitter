<script setup lang="ts">
import type { SplitterRef } from "@fragiola/splitter-vue";
import { PanelBottom, PanelLeft, PanelRight } from "@lucide/vue";
import PanelToggle from "./panel-toggle.vue";
import * as styles from "./styles";

const TOGGLES = [
    { panelId: "explorer", label: "Explorer", icon: PanelLeft },
    { panelId: "outline", label: "Outline", icon: PanelRight },
    { panelId: "terminal", label: "Terminal", icon: PanelBottom },
] as const;

// One toggle per collapsible panel: pressed while the panel shows.
defineProps<{ splitterRef: SplitterRef }>();
</script>

<template>
    <div role="toolbar" aria-label="Panels" :class="styles.toolbar">
        <PanelToggle
            v-for="toggle in TOGGLES"
            :key="toggle.panelId"
            :splitter-ref="splitterRef"
            :panel-id="toggle.panelId"
            :label="toggle.label"
            :icon="toggle.icon"
        />
    </div>
</template>
