<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import { GripHorizontal } from "@lucide/vue";
import * as styles from "./styles";

// A drawer at the bottom of a vertical group. The separator is a thin line with a tab sticking
// out of it, like a drawer's pull: the tab is the separator's content, so it drags the drawer
// up and down, and the arrows move it once the separator has focus.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group orientation="vertical" :class="styles.group">
            <Splitter.Panel id="canvas" min-size="25%">
                <section aria-label="Canvas" :class="styles.panel">
                    <h2 :class="styles.title">Canvas</h2>
                    <p :class="styles.text">
                        Pull the tab up to open the drawer further.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize drawer"
                :class="styles.separator"
            >
                <span data-testid="drawer-tab" :class="styles.tab">
                    <GripHorizontal aria-hidden="true" :class="styles.icon" />
                </span>
            </Splitter.Separator>
            <Splitter.Panel
                id="drawer"
                default-size="35%"
                min-size="15%"
                max-size="70%"
            >
                <section aria-label="Drawer" :class="styles.drawer">
                    <h2 :class="styles.title">Drawer</h2>
                    <p :class="styles.text">
                        Tab to the separator, then use the up and down arrows.
                    </p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
