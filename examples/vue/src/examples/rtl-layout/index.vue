<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
import * as styles from "./styles";

// The group follows the inline direction it inherits: under `dir="rtl"` its first panel starts at
// the right. A drag toward the start (right) shrinks the panel before the separator, and so does
// the arrow pointing that way: RTL is a mirror, not a separate layout. Sides in the styles are
// logical (`ps-`, `border-s-`), so nothing else changes.
</script>

<template>
    <div dir="rtl" lang="ar" :class="styles.frame">
        <Splitter.Group :class="styles.group">
            <Splitter.Panel id="folders" default-size="25%" min-size="15%">
                <section aria-label="Folders" :class="styles.panel">
                    <h2 :class="styles.title">المجلدات</h2>
                    <p :class="styles.text">The first panel, at the right.</p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize folders"
                :class="styles.separator"
            />
            <Splitter.Panel id="messages" default-size="35%" min-size="20%">
                <section aria-label="Messages" :class="styles.panel">
                    <h2 :class="styles.title">الرسائل</h2>
                    <p :class="styles.text">
                        ← grows the panel before the separator.
                    </p>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize messages"
                :class="styles.separator"
            />
            <Splitter.Panel id="reading" min-size="20%">
                <section aria-label="Reading pane" :class="styles.panel">
                    <h2 :class="styles.title">القراءة</h2>
                    <p :class="styles.text">The last panel, at the left.</p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
