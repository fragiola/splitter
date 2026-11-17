<script setup lang="ts">
import { type Layout, Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import { shallowRef } from "vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

/** The layout as the readout shows it: each panel's size, rounded. */
function describe(layout: Readonly<Layout> | undefined) {
    if (!layout) return "…";
    return Object.entries(layout)
        .map(([panelId, size]) => `${panelId} ${Math.round(size)}%`)
        .join(" · ");
}

// Code outside the group drives it through an external ref: `useSplitterRef()` is given to the
// group, and `useSplitter(splitterRef)` hands its model to the toolbar, which runs commands on it.
// The readout follows `@layout-change`, drags included.
const splitterRef = useSplitterRef();
const layout = shallowRef<Readonly<Layout>>();
</script>

<template>
    <div :class="styles.frame">
        <Toolbar :splitter-ref="splitterRef" />
        <output data-testid="layout" :class="styles.readout">{{
            describe(layout)
        }}</output>
        <Splitter.Group
            id="editor-layout"
            :splitter-ref="splitterRef"
            :class="styles.group"
            @layout-change="(next: Readonly<Layout>) => (layout = next)"
        >
            <Splitter.Panel id="sidebar" default-size="25%" min-size="10%">
                <section aria-label="Sidebar" :class="styles.panel">
                    <h2 :class="styles.title">Sidebar</h2>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize sidebar"
                :class="styles.separator"
            />
            <Splitter.Panel id="editor" min-size="30%">
                <section aria-label="Editor" :class="styles.panel">
                    <h2 :class="styles.title">Editor</h2>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize editor"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="inspector"
                default-size="25%"
                min-size="15%"
                collapsible
            >
                <section aria-label="Inspector" :class="styles.panel">
                    <h2 :class="styles.title">Inspector</h2>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
