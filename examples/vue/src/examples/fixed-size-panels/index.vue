<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import * as styles from "./styles";

// When the group itself resizes (the window, a container), a panel keeps its share by default
// (`preserve-relative-size`). The sidebar here keeps its width in pixels instead
// (`preserve-pixel-size`): the editor takes up the whole change. Narrow the group to see it.
const narrow = ref(false);
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <Clickable.Button
                size="sm"
                variant="outline"
                :aria-pressed="narrow"
                @click="narrow = !narrow"
            >
                Narrow the group
            </Clickable.Button>
        </div>
        <div :class="styles.stage(narrow)">
            <Splitter.Group :class="styles.group">
                <Splitter.Panel
                    id="sidebar"
                    :default-size="220"
                    :min-size="140"
                    group-resize-behavior="preserve-pixel-size"
                >
                    <section aria-label="Sidebar" :class="styles.panel">
                        <h2 :class="styles.title">Sidebar</h2>
                        <p :class="styles.text">
                            Keeps its pixels when the group resizes.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize sidebar"
                    :class="styles.separator"
                />
                <Splitter.Panel id="editor" min-size="20%">
                    <section aria-label="Editor" :class="styles.panel">
                        <h2 :class="styles.title">Editor</h2>
                        <p :class="styles.text">Takes up the change.</p>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    </div>
</template>
