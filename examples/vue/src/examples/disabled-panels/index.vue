<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import { ref, useId } from "vue";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Three ways to keep a layout still. A disabled panel (the toolbox) is never moved by a
// separator, so the one beside it cannot move. A disabled separator (between the layers and the
// properties) is out of the tab order and ignores the pointer. A disabled group locks every
// separator. Code can still resize them all (`panel.resize`).
const locked = ref(false);
const lockLabel = useId();
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <span :class="styles.toggle">
                <Switch.Root v-model="locked" :aria-labelledby="lockLabel">
                    <Switch.Thumb />
                </Switch.Root>
                <span :id="lockLabel">Lock the layout</span>
            </span>
        </div>
        <Splitter.Group :disabled="locked" :class="styles.group">
            <Splitter.Panel id="toolbox" default-size="18%" disabled>
                <section aria-label="Toolbox" :class="styles.panel">
                    <h2 :class="styles.title">Toolbox</h2>
                    <p :class="styles.text">A disabled panel.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize toolbox"
                :class="styles.separator"
            />
            <Splitter.Panel id="canvas" min-size="20%">
                <section aria-label="Canvas" :class="styles.panel">
                    <h2 :class="styles.title">Canvas</h2>
                    <p :class="styles.text">
                        Its separator with the layers moves.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize canvas"
                :class="styles.separator"
            />
            <Splitter.Panel id="layers" default-size="22%" min-size="10%">
                <section aria-label="Layers" :class="styles.panel">
                    <h2 :class="styles.title">Layers</h2>
                    <p :class="styles.text">Resizable from the canvas.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                disabled
                aria-label="Resize layers"
                :class="styles.separator"
            />
            <Splitter.Panel id="properties" default-size="22%">
                <section aria-label="Properties" :class="styles.panel">
                    <h2 :class="styles.title">Properties</h2>
                    <p :class="styles.text">Behind a disabled separator.</p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
