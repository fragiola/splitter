<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// Three dots in the middle of each separator. They line up along it, read from its own
// `data-orientation`: a column between side by side panels, a row between stacked ones. Hover,
// `data-dragging` and focus light them. The dots are the separator's content, so they take the
// pointer like the rest of it.
</script>

<template>
    <div :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel id="inbox" default-size="35%" min-size="15%">
                <section aria-label="Inbox" :class="styles.panel">
                    <h2 :class="styles.title">Inbox</h2>
                    <p :class="styles.text">The dots stand in a column here.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize inbox"
                :class="styles.separator"
            >
                <span data-testid="grip" :class="styles.grip">
                    <span data-testid="dot" :class="styles.dot" />
                    <span data-testid="dot" :class="styles.dot" />
                    <span data-testid="dot" :class="styles.dot" />
                </span>
            </Splitter.Separator>
            <Splitter.Panel id="message">
                <Splitter.Group orientation="vertical" :class="styles.nested">
                    <Splitter.Panel id="reader" min-size="20%">
                        <section aria-label="Reader" :class="styles.panel">
                            <h2 :class="styles.title">Reader</h2>
                            <p :class="styles.text">
                                Below, they turn into a row.
                            </p>
                        </section>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize reader"
                        :class="styles.separator"
                    >
                        <span data-testid="grip" :class="styles.grip">
                            <span data-testid="dot" :class="styles.dot" />
                            <span data-testid="dot" :class="styles.dot" />
                            <span data-testid="dot" :class="styles.dot" />
                        </span>
                    </Splitter.Separator>
                    <Splitter.Panel id="reply" default-size="35%" min-size="15%">
                        <section aria-label="Reply" :class="styles.panel">
                            <h2 :class="styles.title">Reply</h2>
                            <p :class="styles.text">
                                Hover, drag or focus a separator.
                            </p>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
