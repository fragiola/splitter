<script setup lang="ts">
import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    useSplitterRef,
    validateSplitter,
} from "@fragiola/splitter-vue";
import { Archive, FileText, Inbox, Send, Star } from "@lucide/vue";
import { type Component, computed, ref } from "vue";
import { load, save } from "../_kit/persistence";
import { FOLDERS, type FolderId, MESSAGES } from "./messages";
import * as styles from "./styles";
import Toolbar from "./toolbar.vue";

const KEY = "fragiola-splitter:email-client";

const ICONS: Record<FolderId, Component> = {
    inbox: Inbox,
    starred: Star,
    sent: Send,
    drafts: FileText,
    archive: Archive,
};

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// A mail app's three panes. The folders collapse to an icon rail (a `collapsedSize` in rem) by a
// drag or from the toolbar, and hide their labels while collapsed (`in-data-collapsed:`). The
// folders and the message list keep their pixels when the window resizes
// (`preserve-pixel-size`): the reader takes up the change. The layout is the model's JSON
// document, saved on every commit and restored before the first render, as `persistent-layout`.
const model = restore();
const splitterRef = useSplitterRef();
const folder = ref<FolderId>("inbox");
const selected = ref<string | undefined>("m1");
const read = ref<string[]>(["m1"]);
const persist = () => save(KEY, model.get("splitter-json"));

const isUnread = (id: string) =>
    MESSAGES.some((m) => m.id === id && m.unread && !read.value.includes(id));
const unread = (id: FolderId) =>
    MESSAGES.filter((m) => m.folder === id && isUnread(m.id)).length;
const messages = computed(() =>
    MESSAGES.filter((m) => m.folder === folder.value),
);
const message = computed(() =>
    messages.value.find((m) => m.id === selected.value),
);
const folderLabel = computed(
    () => FOLDERS.find((f) => f.id === folder.value)?.label,
);

function openFolder(id: FolderId) {
    folder.value = id;
    selected.value = MESSAGES.find((m) => m.folder === id)?.id;
}

function open(id: string) {
    selected.value = id;
    if (!read.value.includes(id)) read.value = [...read.value, id];
}
</script>

<template>
    <div :class="styles.frame">
        <Toolbar :splitter-ref="splitterRef" />
        <Splitter.Group
            id="mail"
            :model="model"
            :splitter-ref="splitterRef"
            :class="styles.group"
            @layout-commit="persist"
        >
            <Splitter.Panel
                id="folders"
                default-size="13rem"
                min-size="10rem"
                max-size="30%"
                collapsible
                collapsed-size="3.25rem"
                group-resize-behavior="preserve-pixel-size"
                :class="styles.folders"
            >
                <nav aria-label="Folders" :class="styles.nav">
                    <button
                        v-for="{ id, label } in FOLDERS"
                        :key="id"
                        type="button"
                        :aria-label="label"
                        :title="label"
                        :aria-current="id === folder ? 'page' : undefined"
                        :data-active="id === folder ? '' : undefined"
                        :class="styles.folder"
                        @click="openFolder(id)"
                    >
                        <component
                            :is="ICONS[id]"
                            aria-hidden="true"
                            :class="styles.icon"
                        />
                        <span :class="styles.label">{{ label }}</span>
                        <span
                            v-if="unread(id) > 0"
                            aria-hidden="true"
                            :class="styles.count"
                        >
                            {{ unread(id) }}
                        </span>
                    </button>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize folders"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="messages"
                :default-size="320"
                :min-size="240"
                :max-size="440"
                group-resize-behavior="preserve-pixel-size"
                :class="styles.list"
            >
                <section aria-label="Messages" :class="styles.pane">
                    <h2 :class="styles.heading">
                        {{ folderLabel }}
                        <span :class="styles.total">{{ messages.length }}</span>
                    </h2>
                    <ul :class="styles.messages">
                        <li v-for="m in messages" :key="m.id">
                            <button
                                type="button"
                                :aria-current="m.id === selected ? 'true' : undefined"
                                :data-active="m.id === selected ? '' : undefined"
                                :data-unread="isUnread(m.id) ? '' : undefined"
                                :class="styles.message"
                                @click="open(m.id)"
                            >
                                <span :class="styles.from">{{ m.from }}</span>
                                <span :class="styles.date">{{ m.date }}</span>
                                <span :class="styles.subject">{{ m.subject }}</span>
                                <span :class="styles.snippet">{{ m.body.join(" ") }}</span>
                            </button>
                        </li>
                    </ul>
                </section>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize message list"
                :class="styles.separator"
            />
            <Splitter.Panel id="reader" min-size="30%">
                <article aria-label="Reader" :class="styles.reader">
                    <template v-if="message">
                        <header :class="styles.header">
                            <h2 :class="styles.title">{{ message.subject }}</h2>
                            <p :class="styles.meta">
                                {{ message.from }} to {{ message.to }} · {{ message.date }}
                            </p>
                        </header>
                        <div :class="styles.body">
                            <p v-for="paragraph in message.body" :key="paragraph">
                                {{ paragraph }}
                            </p>
                        </div>
                    </template>
                    <p v-else :class="styles.empty">No message selected.</p>
                </article>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
