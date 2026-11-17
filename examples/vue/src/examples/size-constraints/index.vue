<script setup lang="ts">
import { type PanelSize, Splitter } from "@fragiola/splitter-vue";
import { shallowRef } from "vue";
import * as styles from "./styles";

/** A panel's size as the readout shows it. */
function describe(size: PanelSize | undefined) {
    if (!size) return "…";
    const pixels =
        size.pixels === undefined ? "" : `${Math.round(size.pixels)} px · `;
    return `${pixels}${size.percentage.toFixed(1)}%`;
}

// Constraints in any unit: rem for the file list, percent for the editor, pixels (a bare number)
// for the preview. The model keeps sizes in percent and resolves the other units with the
// group's measured size, so a drag stops at each limit whatever unit declares it.
const files = shallowRef<PanelSize>();
const editor = shallowRef<PanelSize>();
const preview = shallowRef<PanelSize>();
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel
                id="files"
                default-size="12rem"
                min-size="10rem"
                max-size="20rem"
                @resize="(size: PanelSize) => (files = size)"
            >
                <section aria-label="Files" :class="styles.panel">
                    <h2 :class="styles.title">Files</h2>
                    <p :class="styles.text">10rem to 20rem</p>
                    <output data-testid="files-size" :class="styles.size">{{
                        describe(files)
                    }}</output>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize files"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="editor"
                min-size="30%"
                @resize="(size: PanelSize) => (editor = size)"
            >
                <section aria-label="Editor" :class="styles.panel">
                    <h2 :class="styles.title">Editor</h2>
                    <p :class="styles.text">at least 30%</p>
                    <output data-testid="editor-size" :class="styles.size">{{
                        describe(editor)
                    }}</output>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize editor"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="preview"
                :default-size="200"
                :min-size="120"
                :max-size="360"
                @resize="(size: PanelSize) => (preview = size)"
            >
                <section aria-label="Preview" :class="styles.panel">
                    <h2 :class="styles.title">Preview</h2>
                    <p :class="styles.text">120px to 360px</p>
                    <output data-testid="preview-size" :class="styles.size">{{
                        describe(preview)
                    }}</output>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
