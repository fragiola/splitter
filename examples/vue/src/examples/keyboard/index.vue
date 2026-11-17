<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

const KEYS = [
    { keys: "← →", does: "resize by 5%" },
    { keys: "Home / End", does: "to the smallest / largest size" },
    { keys: "Enter", does: "collapse or expand the panel before it" },
    { keys: "F6", does: "next separator (Shift+F6: previous)" },
];

// The separators follow the WAI-ARIA Window Splitter pattern: each is focusable, says the size of
// the panel before it (`aria-valuenow`) between its limits (`aria-valuemin`, `aria-valuemax`) and
// names the panel it controls (`aria-controls`). Tab to one and use the keys below.
</script>

<template>
    <div :class="styles.frame">
        <dl aria-label="Keys" :class="styles.keys">
            <div v-for="{ keys, does } in KEYS" :key="keys" :class="styles.key">
                <dt :class="styles.kbd">{{ keys }}</dt>
                <dd>{{ does }}</dd>
            </div>
        </dl>
        <Splitter.Group :class="styles.group">
            <Splitter.Panel
                id="outline"
                default-size="30%"
                min-size="15%"
                max-size="50%"
                collapsible
            >
                <section aria-label="Outline" :class="styles.panel">
                    <h2 :class="styles.title">Outline</h2>
                    <p :class="styles.text">15% to 50%, collapsible.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize outline"
                :class="styles.separator"
            />
            <Splitter.Panel id="document" min-size="30%">
                <section aria-label="Document" :class="styles.panel">
                    <h2 :class="styles.title">Document</h2>
                    <p :class="styles.text">At least 30%.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize document"
                :class="styles.separator"
            />
            <Splitter.Panel id="comments" default-size="25%" min-size="10%">
                <section aria-label="Comments" :class="styles.panel">
                    <h2 :class="styles.title">Comments</h2>
                    <p :class="styles.text">At least 10%.</p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
