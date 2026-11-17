<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import { GripVertical } from "@lucide/vue";
import * as styles from "./styles";

// Everything the separators look like comes from their state attributes and the theme's tokens:
// a wide hit area with the theme's line and a grip, the cursor from `data-orientation`, the
// colours from hover, `data-dragging` and focus, and the whole group dimmed while one of its
// separators drags (`data-dragging` on the group too). The package writes only the flex sizing.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel id="blue" default-size="34%" :class="styles.blue">
                <section aria-label="Blue" :class="styles.panel">
                    <h2 :class="styles.title">Blue</h2>
                    <p :class="styles.text">Panels take any palette.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize blue"
                :class="styles.separator"
            >
                <span :class="styles.grip">
                    <GripVertical aria-hidden="true" :class="styles.icon" />
                </span>
            </Splitter.Separator>
            <Splitter.Panel id="stack">
                <Splitter.Group orientation="vertical" :class="styles.nested">
                    <Splitter.Panel id="green" :class="styles.green">
                        <section aria-label="Green" :class="styles.panel">
                            <h2 :class="styles.title">Green</h2>
                            <p :class="styles.text">
                                The grip turns with the separator.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize green"
                        :class="styles.separator"
                    >
                        <span :class="styles.grip">
                            <GripVertical
                                aria-hidden="true"
                                :class="styles.icon"
                            />
                        </span>
                    </Splitter.Separator>
                    <Splitter.Panel id="orange" :class="styles.orange">
                        <section aria-label="Orange" :class="styles.panel">
                            <h2 :class="styles.title">Orange</h2>
                            <p :class="styles.text">
                                Hover, drag or focus a separator.
                            </p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
