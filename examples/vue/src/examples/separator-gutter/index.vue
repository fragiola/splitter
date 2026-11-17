<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// Panels drawn as cards on a canvas. The gap between two cards is the separator: transparent at
// rest, so only the canvas shows, it draws a line on hover, while `data-dragging` and on focus.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel
                id="tasks"
                default-size="40%"
                min-size="20%"
                :class="styles.card"
            >
                <section aria-label="Tasks" :class="styles.panel">
                    <h2 :class="styles.title">Tasks</h2>
                    <p :class="styles.text">
                        The gap between the cards is the separator.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize tasks"
                :class="styles.separator"
            />
            <Splitter.Panel id="details">
                <Splitter.Group orientation="vertical" :class="styles.nested">
                    <Splitter.Panel
                        id="summary"
                        min-size="20%"
                        :class="styles.card"
                    >
                        <section aria-label="Summary" :class="styles.panel">
                            <h2 :class="styles.title">Summary</h2>
                            <p :class="styles.text">
                                Hover a gap to see its line.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize summary"
                        :class="styles.separator"
                    />
                    <Splitter.Panel
                        id="activity"
                        default-size="40%"
                        min-size="20%"
                        :class="styles.card"
                    >
                        <section aria-label="Activity" :class="styles.panel">
                            <h2 :class="styles.title">Activity</h2>
                            <p :class="styles.text">
                                Tab to a gap: focus draws it too.
                            </p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
