<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// A code editor's sash. The separator is 1px (what the engine measures) and its `::before` is a
// 9px hit area that never changes. Its `::after` is what you see: a 1px line at rest that, after
// the pointer rests on it for a moment (a `transition-delay`), while `data-dragging` and on focus,
// grows to 4px in the accent colour.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel id="explorer" default-size="28%" min-size="15%">
                <section aria-label="Explorer" :class="styles.panel">
                    <h2 :class="styles.title">Explorer</h2>
                    <p :class="styles.text">
                        Rest the pointer on a line: it thickens after a moment.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize explorer"
                :class="styles.separator"
            />
            <Splitter.Panel id="work">
                <Splitter.Group orientation="vertical" :class="styles.nested">
                    <Splitter.Panel id="editor" min-size="20%">
                        <section aria-label="Editor" :class="styles.panel">
                            <h2 :class="styles.title">Editor</h2>
                            <p :class="styles.text">
                                Dragging shows the sash at once.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize editor"
                        :class="styles.separator"
                    />
                    <Splitter.Panel
                        id="terminal"
                        default-size="35%"
                        min-size="15%"
                    >
                        <section aria-label="Terminal" :class="styles.panel">
                            <h2 :class="styles.title">Terminal</h2>
                            <p :class="styles.text">
                                The hit area stays the same in every state.
                            </p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
