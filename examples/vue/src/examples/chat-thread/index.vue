<script setup lang="ts">
import { Splitter, useSplitterRef } from "@fragiola/splitter-vue";
import { Hash, SendHorizontal, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import {
    authorOf,
    CHANNELS,
    type ChannelId,
    initials,
    ME,
    MEMBERS,
    MESSAGES,
    type Post,
    type Presence,
    repliesLabel,
} from "./data";
import Header from "./header.vue";
import * as styles from "./styles";

const PRESENCES: { presence: Presence; label: string }[] = [
    { presence: "online", label: "Online" },
    { presence: "away", label: "Away" },
    { presence: "offline", label: "Offline" },
];

/** The text of a message box, cleared once read. */
function take(event: Event): string {
    const form = event.currentTarget as HTMLFormElement;
    const text = String(new FormData(form).get("text") ?? "").trim();
    form.reset();
    return text;
}

// A team chat: channels, the conversation, a thread and the members. The thread panel is rendered
// only while a thread is open, between the conversation and the members, where the markup puts
// it; the group remembers the layout of each set of panels, so a thread opened again comes back
// at the size the user gave it. The members collapse from the header's toggle (an external ref,
// read back with `useSplitterState`). The channels have constraints in rem.
const splitterRef = useSplitterRef();
const channelId = ref<ChannelId>("design");
const threadId = ref<string | undefined>();
const seen = ref<ChannelId[]>(["design"]);
// what you posted, by channel id or by the id of the message whose thread it answers
const posted = ref<Record<string, Post[]>>({});
const channel = computed(
    () => CHANNELS.find((c) => c.id === channelId.value) ?? CHANNELS[0],
);
const messages = computed(() => [
    ...MESSAGES.filter((m) => m.channel === channelId.value),
    ...(posted.value[channelId.value] ?? []),
]);
const thread = computed(() => MESSAGES.find((m) => m.id === threadId.value));
const repliesOf = (id: string) => [
    ...(MESSAGES.find((m) => m.id === id)?.replies ?? []),
    ...(posted.value[id] ?? []),
];
const unread = (id: ChannelId) =>
    seen.value.includes(id)
        ? undefined
        : CHANNELS.find((c) => c.id === id)?.unread;
const membersBy = (presence: Presence) =>
    MEMBERS.filter((m) => m.presence === presence);

function openChannel(id: ChannelId) {
    channelId.value = id;
    threadId.value = undefined;
    if (!seen.value.includes(id)) seen.value = [...seen.value, id];
}

function post(key: string, event: Event) {
    const text = take(event);
    if (!text) return;
    const id = `${key}-${(posted.value[key]?.length ?? 0) + 1}`;
    posted.value = {
        ...posted.value,
        [key]: [
            ...(posted.value[key] ?? []),
            { id, authorId: ME, time: "Just now", text },
        ],
    };
}
</script>

<template>
    <div :class="styles.frame">
        <Header :splitter-ref="splitterRef" />
        <Splitter.Group id="chat" :splitter-ref="splitterRef" :class="styles.group">
            <Splitter.Panel
                id="channels"
                default-size="14rem"
                min-size="10rem"
                max-size="20rem"
                :class="styles.side"
            >
                <nav aria-label="Channels" :class="styles.nav">
                    <h2 :class="styles.caption">Channels</h2>
                    <button
                        v-for="c in CHANNELS"
                        :key="c.id"
                        type="button"
                        :aria-current="c.id === channelId ? 'page' : undefined"
                        :data-active="c.id === channelId ? '' : undefined"
                        :data-unread="unread(c.id) ? '' : undefined"
                        :class="styles.channel"
                        @click="openChannel(c.id)"
                    >
                        <Hash aria-hidden="true" :class="styles.hash" />
                        <span :class="styles.name">{{ c.name }}</span>
                        <span v-if="unread(c.id)" :class="styles.count">
                            {{ unread(c.id) }}
                        </span>
                    </button>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize channels"
                :class="styles.separator"
            />
            <Splitter.Panel id="conversation" min-size="25%">
                <section aria-label="Conversation" :class="styles.pane">
                    <header :class="styles.header">
                        <div :class="styles.heading">
                            <h2 :class="styles.title"># {{ channel?.name }}</h2>
                            <p :class="styles.topic">{{ channel?.topic }}</p>
                        </div>
                    </header>
                    <ul :class="styles.feed">
                        <li
                            v-for="m in messages"
                            :key="m.id"
                            :data-active="m.id === threadId ? '' : undefined"
                            :class="styles.post"
                        >
                            <span
                                aria-hidden="true"
                                :class="styles.avatar(authorOf(m).tone)"
                            >
                                {{ initials(authorOf(m).name) }}
                            </span>
                            <p :class="styles.byline">
                                <span :class="styles.author">{{ authorOf(m).name }}</span>
                                <span :class="styles.time">{{ m.time }}</span>
                            </p>
                            <p :class="styles.text">{{ m.text }}</p>
                            <button
                                v-if="repliesOf(m.id).length > 0"
                                type="button"
                                :aria-expanded="m.id === threadId"
                                :class="styles.replies"
                                @click="threadId = m.id"
                            >
                                {{ repliesLabel(repliesOf(m.id).length) }}
                            </button>
                        </li>
                    </ul>
                    <form :class="styles.composer" @submit.prevent="post(channelId, $event)">
                        <input
                            name="text"
                            autocomplete="off"
                            :aria-label="`Message #${channel?.name}`"
                            :placeholder="`Message #${channel?.name}`"
                            :class="styles.input"
                        />
                        <Clickable.Button
                            type="submit"
                            size="sm"
                            variant="icon"
                            shape="square"
                            aria-label="Send"
                            :class="styles.send"
                        >
                            <SendHorizontal aria-hidden="true" />
                        </Clickable.Button>
                    </form>
                </section>
            </Splitter.Panel>
            <template v-if="thread">
                <Splitter.Separator
                    aria-label="Resize thread"
                    :class="styles.separator"
                />
                <Splitter.Panel
                    id="thread"
                    default-size="30%"
                    min-size="20%"
                    max-size="45%"
                >
                    <section aria-label="Thread" :class="styles.pane">
                        <header :class="styles.header">
                            <div :class="styles.heading">
                                <h2 :class="styles.title">Thread</h2>
                                <p :class="styles.topic"># {{ channel?.name }}</p>
                            </div>
                            <Clickable.Button
                                size="sm"
                                variant="icon"
                                shape="square"
                                aria-label="Close thread"
                                :class="styles.close"
                                @click="threadId = undefined"
                            >
                                <X aria-hidden="true" />
                            </Clickable.Button>
                        </header>
                        <ul :class="styles.feed">
                            <template
                                v-for="(p, index) in [thread, ...repliesOf(thread.id)]"
                                :key="p.id"
                            >
                                <li :class="styles.post">
                                    <span
                                        aria-hidden="true"
                                        :class="styles.avatar(authorOf(p).tone)"
                                    >
                                        {{ initials(authorOf(p).name) }}
                                    </span>
                                    <p :class="styles.byline">
                                        <span :class="styles.author">{{ authorOf(p).name }}</span>
                                        <span :class="styles.time">{{ p.time }}</span>
                                    </p>
                                    <p :class="styles.text">{{ p.text }}</p>
                                </li>
                                <li v-if="index === 0" :class="styles.divider">
                                    {{ repliesLabel(repliesOf(thread.id).length) }}
                                </li>
                            </template>
                        </ul>
                        <form :class="styles.composer" @submit.prevent="post(thread.id, $event)">
                            <input
                                name="text"
                                autocomplete="off"
                                aria-label="Reply"
                                placeholder="Reply…"
                                :class="styles.input"
                            />
                            <Clickable.Button
                                type="submit"
                                size="sm"
                                variant="icon"
                                shape="square"
                                aria-label="Send reply"
                                :class="styles.send"
                            >
                                <SendHorizontal aria-hidden="true" />
                            </Clickable.Button>
                        </form>
                    </section>
                </Splitter.Panel>
            </template>
            <Splitter.Separator
                aria-label="Resize members"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="members"
                default-size="13rem"
                min-size="10rem"
                max-size="18rem"
                collapsible
                :class="styles.side"
            >
                <section aria-label="Members" :class="styles.nav">
                    <div v-for="{ presence, label } in PRESENCES" :key="presence">
                        <h2 :class="styles.caption">
                            {{ label }} — {{ membersBy(presence).length }}
                        </h2>
                        <ul :class="styles.people">
                            <li
                                v-for="m in membersBy(presence)"
                                :key="m.id"
                                :class="styles.person"
                            >
                                <span aria-hidden="true" :class="styles.face(m.tone)">
                                    {{ initials(m.name) }}
                                </span>
                                <span :class="styles.who">
                                    <span :class="styles.name">{{ m.name }}</span>
                                    <span :class="styles.role">{{ m.title }}</span>
                                </span>
                                <span
                                    aria-hidden="true"
                                    :class="styles.presence(m.presence)"
                                />
                            </li>
                        </ul>
                    </div>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
