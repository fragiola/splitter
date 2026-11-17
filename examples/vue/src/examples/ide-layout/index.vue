<script setup lang="ts">
import { Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import { FileCode } from "@lucide/vue";
import { ACTIVE, CODE, FILES, OUTLINE, TERMINAL } from "./files";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

// A workbench as an editor lays it out: three groups in one model. The explorer and the outline
// have minimums in rem, the terminal in pixels, and all three collapse; the toolbar toggles them
// through the external ref, and each button follows its panel with `useSplitterState`.
const splitterRef = useSplitterRef();
</script>

<template>
    <div :class="styles.frame">
        <Toolbar :splitter-ref="splitterRef" />
        <Splitter.Group
            id="ide"
            :splitter-ref="splitterRef"
            :class="styles.group"
        >
            <Splitter.Panel
                id="explorer"
                default-size="22%"
                min-size="10rem"
                max-size="40%"
                collapsible
                :class="styles.side"
            >
                <nav aria-label="Explorer" :class="styles.pane">
                    <h2 :class="styles.heading">Explorer</h2>
                    <ul :class="styles.list">
                        <li
                            v-for="file in FILES"
                            :key="file.path"
                            :data-active="file.active ? '' : undefined"
                            :class="styles.file(file.depth)"
                        >
                            <FileCode aria-hidden="true" :class="styles.icon" />
                            <span :class="styles.name">{{ file.name }}</span>
                        </li>
                    </ul>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize explorer"
                :class="styles.separator"
            />
            <Splitter.Panel id="workspace" min-size="30%">
                <Splitter.Group
                    id="workspace-column"
                    orientation="vertical"
                    :class="styles.nested"
                >
                    <Splitter.Panel id="editors" min-size="30%">
                        <Splitter.Group id="editor-row" :class="styles.nested">
                            <Splitter.Panel id="editor" min-size="30%">
                                <section aria-label="Editor" :class="styles.editor">
                                    <h2 :class="styles.tab">{{ ACTIVE }}</h2>
                                    <pre :class="styles.code">{{ CODE }}</pre>
                                </section>
                            </Splitter.Panel>
                            <Splitter.Separator
                                aria-label="Resize editor"
                                :class="styles.separator"
                            />
                            <Splitter.Panel
                                id="outline"
                                default-size="26%"
                                min-size="9rem"
                                collapsible
                                :class="styles.side"
                            >
                                <section aria-label="Outline" :class="styles.pane">
                                    <h2 :class="styles.heading">Outline</h2>
                                    <ul :class="styles.list">
                                        <li
                                            v-for="symbol in OUTLINE"
                                            :key="symbol"
                                            :class="styles.symbol"
                                        >
                                            {{ symbol }}
                                        </li>
                                    </ul>
                                </section>
                            </Splitter.Panel>
                        </Splitter.Group>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize editors"
                        :class="styles.separator"
                    />
                    <Splitter.Panel
                        id="terminal"
                        default-size="30%"
                        :min-size="96"
                        collapsible
                        :class="styles.side"
                    >
                        <section aria-label="Terminal" :class="styles.pane">
                            <h2 :class="styles.heading">Terminal</h2>
                            <pre :class="styles.code">{{ TERMINAL }}</pre>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
