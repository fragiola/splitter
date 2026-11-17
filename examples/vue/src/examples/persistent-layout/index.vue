<script setup lang="ts">
import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    validateSplitter,
} from "@fragiola/splitter-vue";
import { Clickable } from "#/components/atoms/clickable";
import { load, save } from "../_kit/persistence";
import * as styles from "./styles";

const KEY = "fragiola-splitter:persistent-layout";

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// Persistence is the app's, in `_kit/persistence.ts`: the whole layout (both groups, the collapsed
// panel and the size it expands back to) is the model's JSON document, saved on every commit and
// restored by `createSplitterModel(json)` before the first render, so the page never shows the
// default layout first. Resize, collapse the terminal, then reload.
const model = restore();
const persist = () => save(KEY, model.get("splitter-json"));

function reset() {
    for (const group of model.get("groups")) {
        model.run("group.reset", { groupId: group.id });
    }
}
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <Clickable.Button size="sm" variant="outline" @click="reset">
                Reset the layout
            </Clickable.Button>
            <span :class="styles.hint">
                Saved in this browser on every change.
            </span>
        </div>
        <Splitter.Group
            id="persistent"
            :model="model"
            :class="styles.group"
            @layout-commit="persist"
        >
            <Splitter.Panel id="sidebar" default-size="25%" min-size="10%">
                <section aria-label="Sidebar" :class="styles.panel">
                    <h2 :class="styles.title">Sidebar</h2>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize sidebar"
                :class="styles.separator"
            />
            <Splitter.Panel id="main">
                <Splitter.Group
                    id="persistent-main"
                    orientation="vertical"
                    :class="styles.nested"
                    @layout-commit="persist"
                >
                    <Splitter.Panel id="editor" min-size="20%">
                        <section aria-label="Editor" :class="styles.panel">
                            <h2 :class="styles.title">Editor</h2>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize editor"
                        :class="styles.separator"
                    />
                    <Splitter.Panel
                        id="terminal"
                        default-size="30%"
                        min-size="15%"
                        collapsible
                    >
                        <section aria-label="Terminal" :class="styles.panel">
                            <h2 :class="styles.title">Terminal</h2>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
