<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

const LINES = [
    "$ pnpm dev",
    "VITE ready in 212 ms",
    "➜ Local: http://localhost:5184/",
];

// A vertical group stacks its panels: the separator between them is horizontal
// (`aria-orientation="horizontal"`), drags up and down, and its arrows are Up and Down.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group orientation="vertical" :class="styles.group">
            <Splitter.Panel id="editor" default-size="65%" min-size="20%">
                <section aria-label="Editor" :class="styles.panel">
                    <h2 :class="styles.title">Editor</h2>
                    <p :class="styles.text">Drag the separator up or down.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize editor"
                :class="styles.separator"
            />
            <Splitter.Panel id="terminal" min-size="15%">
                <section aria-label="Terminal" :class="styles.panel">
                    <h2 :class="styles.title">Terminal</h2>
                    <pre :class="styles.code">{{ LINES.join("\n") }}</pre>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
