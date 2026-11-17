<script setup lang="ts">
import { Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

// Undo and redo are the app's, in `_kit/undo.ts`: it listens to the model (`model.subscribe`) and
// keeps every group's layout before and after each committed change; undo and redo put them back
// in one `batch`. A whole drag is one step, so is a key press or a collapse. Ctrl/Cmd+Z undoes,
// Shift+Ctrl/Cmd+Z redoes.
const splitterRef = useSplitterRef();
</script>

<template>
    <div :class="styles.frame">
        <Toolbar :splitter-ref="splitterRef" />
        <Splitter.Group :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel
                id="outline"
                default-size="25%"
                min-size="15%"
                collapsible
            >
                <section aria-label="Outline" :class="styles.panel">
                    <h2 :class="styles.title">Outline</h2>
                    <p :class="styles.text">Collapsible.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize outline"
                :class="styles.separator"
            />
            <Splitter.Panel id="draft" min-size="30%">
                <section aria-label="Draft" :class="styles.panel">
                    <h2 :class="styles.title">Draft</h2>
                    <p :class="styles.text">
                        Drag, press keys on a separator, then undo.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize draft"
                :class="styles.separator"
            />
            <Splitter.Panel id="notes" default-size="25%" min-size="10%">
                <section aria-label="Notes" :class="styles.panel">
                    <h2 :class="styles.title">Notes</h2>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
