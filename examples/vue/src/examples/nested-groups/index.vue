<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// A group inside a panel nests in it: it joins the outer group's model (one
// `model.get("splitter-json")` saves both) and its path starts with that panel's (`/g0/p1/g0`).
// Each separator resizes its own group only.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group id="workbench" :class="styles.group">
            <Splitter.Panel id="sidebar" default-size="28%" min-size="15%">
                <section aria-label="Sidebar" :class="styles.panel">
                    <h2 :class="styles.title">Sidebar</h2>
                    <p :class="styles.text">The outer group.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize sidebar"
                :class="styles.separator"
            />
            <Splitter.Panel id="main">
                <Splitter.Group
                    id="main-column"
                    orientation="vertical"
                    :class="styles.nested"
                >
                    <Splitter.Panel id="editor" default-size="65%">
                        <section aria-label="Editor" :class="styles.panel">
                            <h2 :class="styles.title">Editor</h2>
                            <p :class="styles.text">
                                A vertical group nested in the main panel.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize editor"
                        :class="styles.separator"
                    />
                    <Splitter.Panel id="terminal">
                        <section aria-label="Terminal" :class="styles.panel">
                            <h2 :class="styles.title">Terminal</h2>
                            <p :class="styles.text">
                                Its separator moves the editor and the terminal
                                only.
                            </p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
