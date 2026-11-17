<script setup lang="ts">
import {
    Splitter,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { ChevronLeft } from "@lucide/vue";
import { computed } from "vue";
import * as styles from "./styles";

// A button on the separator collapses and expands the panel before it through the model
// (`panel.collapse`, `panel.expand`); its icon turns from the panel's `data-collapsed`, its name
// follows `useSplitterState`. Content inside a separator can keep its events from the separator:
// its listeners stop them (`.stop`), so pressing the button never starts a drag, its keys never
// move the separator, and a double click on it never resets the layout.
const splitterRef = useSplitterRef();
const splitter = useSplitter(splitterRef);
const state = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "outline" }),
    { splitterRef },
);
const collapsed = computed(() => state.value ?? false);

function toggle() {
    const model = splitter.value?.model;
    if (!model) return;
    if (collapsed.value) model.run("panel.expand", { panelId: "outline" });
    else model.run("panel.collapse", { panelId: "outline" });
}
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel
                id="outline"
                default-size="30%"
                min-size="10rem"
                collapsible
            >
                <section aria-label="Outline" :class="styles.side">
                    <h2 :class="styles.title">Outline</h2>
                    <p :class="styles.text">
                        Use the button on the separator to hide this panel.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize outline"
                :class="styles.separator"
            >
                <button
                    type="button"
                    :aria-label="
                        collapsed ? 'Expand the outline' : 'Collapse the outline'
                    "
                    aria-controls="outline"
                    :aria-expanded="!collapsed"
                    :class="styles.toggle"
                    @click="toggle"
                    @pointerdown.stop
                    @keydown.stop
                    @dblclick.stop
                >
                    <ChevronLeft aria-hidden="true" :class="styles.icon" />
                </button>
            </Splitter.Separator>
            <Splitter.Panel id="page">
                <section aria-label="Page" :class="styles.panel">
                    <h2 :class="styles.title">Page</h2>
                    <p :class="styles.text">
                        The separator still drags, and Enter on it still
                        collapses the outline.
                    </p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
