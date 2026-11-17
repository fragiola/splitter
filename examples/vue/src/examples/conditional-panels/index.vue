<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import { ref, useId } from "vue";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Panels rendered conditionally: each takes its place from its position in the markup, never
// from when it mounts, so the inspector shown again lands at the end. A separator goes with the
// panel it belongs to. The group remembers a layout per set of panels: resize, hide the inspector
// and show it again, and every panel comes back at the size it had.
const sidebar = ref(true);
const inspector = ref(true);
const sidebarLabel = useId();
const inspectorLabel = useId();
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.toggle">
                <Switch.Root v-model="sidebar" :aria-labelledby="sidebarLabel">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="sidebarLabel">Sidebar</span>
            </span>
            <span :class="styles.toggle">
                <Switch.Root
                    v-model="inspector"
                    :aria-labelledby="inspectorLabel"
                >
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="inspectorLabel">Inspector</span>
            </span>
        </div>
        <Splitter.Group :class="styles.group">
            <template v-if="sidebar">
                <Splitter.Panel id="sidebar" default-size="25%" min-size="10%">
                    <section aria-label="Sidebar" :class="styles.panel">
                        <h2 :class="styles.title">Sidebar</h2>
                        <p :class="styles.text">
                            Rendered while its switch is on.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize sidebar"
                    :class="styles.separator"
                />
            </template>
            <Splitter.Panel id="editor" min-size="20%">
                <section aria-label="Editor" :class="styles.panel">
                    <h2 :class="styles.title">Editor</h2>
                    <p :class="styles.text">Always rendered.</p>
                </section>
            </Splitter.Panel>
            <template v-if="inspector">
                <Splitter.Separator
                    aria-label="Resize inspector"
                    :class="styles.separator"
                />
                <Splitter.Panel
                    id="inspector"
                    default-size="25%"
                    min-size="10%"
                >
                    <section aria-label="Inspector" :class="styles.panel">
                        <h2 :class="styles.title">Inspector</h2>
                        <p :class="styles.text">
                            Comes back at the end, where the markup puts it.
                        </p>
                    </section>
                </Splitter.Panel>
            </template>
        </Splitter.Group>
    </div>
</template>
