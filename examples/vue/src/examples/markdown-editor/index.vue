<script setup lang="ts">
import { Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import { computed, ref, useId } from "vue";
import { Switch } from "#/components/ui/switch";
import { renderMarkdown } from "./render";
import { SAMPLE } from "./sample";
import * as styles from "./styles";
import ViewModes from "./view-modes.vue";

// An editor beside its live preview. The view buttons outside the group drive it through the
// external ref: Editor and Preview collapse the other pane, Split expands it back to the size it
// had, and the pressed button is read from the model (`useSplitterState`), so a drag that
// collapses a pane presses its button too. The switch changes the group's orientation; the
// layout is in percent, so the panes keep their sizes when they stack.
const splitterRef = useSplitterRef();
const text = ref(SAMPLE);
const stacked = ref(false);
const stackedLabel = useId();
// escaped by construction (render.ts): the only tags in it are the renderer's own, so v-html is safe
const html = computed(() => renderMarkdown(text.value));
</script>

<template>
    <div :class="styles.frame">
        <div role="toolbar" aria-label="View" :class="styles.toolbar">
            <ViewModes :splitter-ref="splitterRef" />
            <span :class="styles.stack">
                <Switch.Root v-model="stacked" :aria-labelledby="stackedLabel">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="stackedLabel">Stacked</span>
            </span>
        </div>
        <Splitter.Group
            id="markdown"
            :orientation="stacked ? 'vertical' : 'horizontal'"
            :splitter-ref="splitterRef"
            :class="styles.group"
        >
            <Splitter.Panel
                id="editor"
                min-size="20%"
                collapsible
                :class="styles.side"
            >
                <section aria-label="Editor" :class="styles.pane">
                    <h2 :class="styles.tab">notes.md</h2>
                    <textarea
                        v-model="text"
                        aria-label="Markdown"
                        spellcheck="false"
                        :class="styles.source"
                    />
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize editor"
                :class="styles.separator"
            />
            <Splitter.Panel id="preview" min-size="20%" collapsible>
                <section aria-label="Preview" :class="styles.page">
                    <h2 :class="styles.tab">Preview</h2>
                    <div data-testid="preview" :class="styles.preview" v-html="html" />
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
