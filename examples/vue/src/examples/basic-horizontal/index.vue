<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// Three panels side by side. Each declares its default size; each separator carries its own
// accessible name (the package renders none). Drag a separator, or double click it to put the
// panel before it back to its default size.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel id="navigation" default-size="25%">
                <section aria-label="Navigation" :class="styles.panel">
                    <h2 :class="styles.title">Navigation</h2>
                    <p :class="styles.text">25% to start with.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize navigation"
                :class="styles.separator"
            />
            <Splitter.Panel id="content" default-size="50%">
                <section aria-label="Content" :class="styles.panel">
                    <h2 :class="styles.title">Content</h2>
                    <p :class="styles.text">
                        Drag a separator, or double click it to reset its panel.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize content"
                :class="styles.separator"
            />
            <Splitter.Panel id="details" default-size="25%">
                <section aria-label="Details" :class="styles.panel">
                    <h2 :class="styles.title">Details</h2>
                    <p :class="styles.text">25% to start with.</p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
