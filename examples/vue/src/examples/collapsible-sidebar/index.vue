<script setup lang="ts">
import { Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import { FileText, Folder, Search, Settings } from "@lucide/vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

const ITEMS = [
    { label: "Files", icon: Folder },
    { label: "Search", icon: Search },
    { label: "Notes", icon: FileText },
    { label: "Settings", icon: Settings },
];

// A collapsible panel collapses when a drag takes it past half its minimum, down to its collapsed
// size (a rail of 3rem here), and remembers the size it had: dragging it back, Enter on the
// separator or `panel.expand` restores it. The sidebar shows its labels only while expanded,
// styled from its `data-collapsed`. The toolbar outside the group follows the panel with
// `useSplitterState`.
const splitterRef = useSplitterRef();
</script>

<template>
    <div :class="styles.frame">
        <Toolbar :splitter-ref="splitterRef" />
        <Splitter.Group :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel
                id="sidebar"
                default-size="25%"
                min-size="10rem"
                collapsible
                collapsed-size="3rem"
                :class="styles.sidebar"
            >
                <nav aria-label="Sidebar" :class="styles.nav">
                    <a
                        v-for="{ label, icon } in ITEMS"
                        :key="label"
                        :href="`#${label.toLowerCase()}`"
                        :aria-label="label"
                        :class="styles.item"
                    >
                        <component
                            :is="icon"
                            aria-hidden="true"
                            :class="styles.icon"
                        />
                        <span :class="styles.label">{{ label }}</span>
                    </a>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize sidebar"
                :class="styles.separator"
            />
            <Splitter.Panel id="main">
                <section aria-label="Document" :class="styles.panel">
                    <h2 :class="styles.title">Document</h2>
                    <p :class="styles.text">
                        Drag the sidebar narrower than 10rem to collapse it.
                    </p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
