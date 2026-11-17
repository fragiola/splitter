<script setup lang="ts">
import {
    Splitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-vue";
import { computed } from "vue";
import * as styles from "./styles";

// A badge on the separator shows the size of the panel before it. The size comes from the model
// (`panel-size-by` through `useSplitterState`), so it follows every drag step and every key; the
// badge shows only while the separator is dragged (`data-dragging`) or focused from the keyboard.
// It is hidden from assistive technology: the separator already says its value (`aria-valuenow`).
const splitterRef = useSplitterRef();
const size = useSplitterState(
    ({ model }) =>
        model.get("panel-size-by", { panelId: "source" })?.percentage,
    { splitterRef },
);
const label = computed(() =>
    size.value === undefined ? "" : `${Math.round(size.value)}%`,
);
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel id="source" default-size="50%" min-size="20%">
                <section aria-label="Source" :class="styles.panel">
                    <h2 :class="styles.title">Source</h2>
                    <p :class="styles.text">
                        Drag the separator, or Tab to it and use the arrows.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize source"
                :class="styles.separator"
            >
                <span
                    aria-hidden="true"
                    data-testid="readout"
                    :class="styles.readout"
                >
                    {{ label }}
                </span>
            </Splitter.Separator>
            <Splitter.Panel id="preview" min-size="20%">
                <section aria-label="Preview" :class="styles.panel">
                    <h2 :class="styles.title">Preview</h2>
                    <p :class="styles.text">
                        The badge reads the size of the source panel.
                    </p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
