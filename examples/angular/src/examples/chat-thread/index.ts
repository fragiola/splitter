import { Component, computed, signal } from "@angular/core";
import { createSplitterRef, SPLITTER } from "@fragiola/splitter-angular";
import { LucideHash, LucideSendHorizontal, LucideX } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
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
import { Header } from "./header";
import * as styles from "./styles";

const PRESENCES: { presence: Presence; label: string }[] = [
    { presence: "online", label: "Online" },
    { presence: "away", label: "Away" },
    { presence: "offline", label: "Offline" },
];

/** The text of a message box, cleared once read. */
function take(event: Event): string {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const text = String(new FormData(form).get("text") ?? "").trim();
    form.reset();
    return text;
}

// A team chat: channels, the conversation, a thread and the members. The thread panel is rendered
// only while a thread is open, between the conversation and the members, where the markup puts
// it; the group remembers the layout of each set of panels, so a thread opened again comes back
// at the size the user gave it. The members collapse from the header's toggle (an external ref,
// read back with `injectSplitterState`). The channels have constraints in rem.
@Component({
    selector: "example-chat-thread",
    imports: [
        SPLITTER,
        ClickableButton,
        Header,
        LucideHash,
        LucideSendHorizontal,
        LucideX,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-chat-thread-header [splitterRef]="splitterRef" />
            <div splitterGroup id="chat" [splitterRef]="splitterRef" [class]="styles.group">
                <div
                    splitterPanel
                    id="channels"
                    defaultSize="14rem"
                    minSize="10rem"
                    maxSize="20rem"
                    [class]="styles.side"
                >
                    <nav aria-label="Channels" [class]="styles.nav">
                        <h2 [class]="styles.caption">Channels</h2>
                        @for (c of channels; track c.id) {
                            <button
                                type="button"
                                [attr.aria-current]="c.id === channelId() ? 'page' : null"
                                [attr.data-active]="c.id === channelId() ? '' : null"
                                [attr.data-unread]="unread(c.id) ? '' : null"
                                [class]="styles.channel"
                                (click)="openChannel(c.id)"
                            >
                                <svg lucideHash aria-hidden="true" [class]="styles.hash"></svg>
                                <span [class]="styles.name">{{ c.name }}</span>
                                @if (unread(c.id); as count) {
                                    <span [class]="styles.count">{{ count }}</span>
                                }
                            </button>
                        }
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize channels"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="conversation" minSize="25%">
                    <section aria-label="Conversation" [class]="styles.pane">
                        <header [class]="styles.header">
                            <div [class]="styles.heading">
                                <h2 [class]="styles.title"># {{ channel()?.name }}</h2>
                                <p [class]="styles.topic">{{ channel()?.topic }}</p>
                            </div>
                        </header>
                        <ul [class]="styles.feed">
                            @for (m of messages(); track m.id) {
                                @let author = authorOf(m);
                                @let count = repliesOf(m.id).length;
                                <li
                                    [attr.data-active]="m.id === threadId() ? '' : null"
                                    [class]="styles.post"
                                >
                                    <span aria-hidden="true" [class]="styles.avatar(author.tone)">
                                        {{ initials(author.name) }}
                                    </span>
                                    <p [class]="styles.byline">
                                        <span [class]="styles.author">{{ author.name }}</span>
                                        <span [class]="styles.time">{{ m.time }}</span>
                                    </p>
                                    <p [class]="styles.text">{{ m.text }}</p>
                                    @if (count > 0) {
                                        <button
                                            type="button"
                                            [attr.aria-expanded]="m.id === threadId()"
                                            [class]="styles.replies"
                                            (click)="threadId.set(m.id)"
                                        >
                                            {{ repliesLabel(count) }}
                                        </button>
                                    }
                                </li>
                            }
                        </ul>
                        <form [class]="styles.composer" (submit)="post(channelId(), $event)">
                            <input
                                name="text"
                                autocomplete="off"
                                [attr.aria-label]="'Message #' + channel()?.name"
                                [placeholder]="'Message #' + channel()?.name"
                                [class]="styles.input"
                            />
                            <button
                                kitClickable
                                type="submit"
                                size="sm"
                                variant="icon"
                                shape="square"
                                aria-label="Send"
                                [class]="styles.send"
                            >
                                <svg lucideSendHorizontal aria-hidden="true"></svg>
                            </button>
                        </form>
                    </section>
                </div>
                @if (thread(); as thread) {
                    <div
                        splitterSeparator
                        aria-label="Resize thread"
                        [class]="styles.separator"
                    ></div>
                    <div splitterPanel id="thread" defaultSize="30%" minSize="20%" maxSize="45%">
                        <section aria-label="Thread" [class]="styles.pane">
                            <header [class]="styles.header">
                                <div [class]="styles.heading">
                                    <h2 [class]="styles.title">Thread</h2>
                                    <p [class]="styles.topic"># {{ channel()?.name }}</p>
                                </div>
                                <button
                                    kitClickable
                                    size="sm"
                                    variant="icon"
                                    shape="square"
                                    aria-label="Close thread"
                                    [class]="styles.close"
                                    (click)="threadId.set(undefined)"
                                >
                                    <svg lucideX aria-hidden="true"></svg>
                                </button>
                            </header>
                            <ul [class]="styles.feed">
                                @for (p of threadPosts(thread); track p.id; let first = $first) {
                                    @let author = authorOf(p);
                                    <li [class]="styles.post">
                                        <span aria-hidden="true" [class]="styles.avatar(author.tone)">
                                            {{ initials(author.name) }}
                                        </span>
                                        <p [class]="styles.byline">
                                            <span [class]="styles.author">{{ author.name }}</span>
                                            <span [class]="styles.time">{{ p.time }}</span>
                                        </p>
                                        <p [class]="styles.text">{{ p.text }}</p>
                                    </li>
                                    @if (first) {
                                        <li [class]="styles.divider">
                                            {{ repliesLabel(repliesOf(thread.id).length) }}
                                        </li>
                                    }
                                }
                            </ul>
                            <form [class]="styles.composer" (submit)="post(thread.id, $event)">
                                <input
                                    name="text"
                                    autocomplete="off"
                                    aria-label="Reply"
                                    placeholder="Reply…"
                                    [class]="styles.input"
                                />
                                <button
                                    kitClickable
                                    type="submit"
                                    size="sm"
                                    variant="icon"
                                    shape="square"
                                    aria-label="Send reply"
                                    [class]="styles.send"
                                >
                                    <svg lucideSendHorizontal aria-hidden="true"></svg>
                                </button>
                            </form>
                        </section>
                    </div>
                }
                <div
                    splitterSeparator
                    aria-label="Resize members"
                    [class]="styles.separator"
                ></div>
                <div
                    splitterPanel
                    id="members"
                    defaultSize="13rem"
                    minSize="10rem"
                    maxSize="18rem"
                    collapsible
                    [class]="styles.side"
                >
                    <section aria-label="Members" [class]="styles.nav">
                        @for (group of presences; track group.presence) {
                            @let people = membersBy(group.presence);
                            <div>
                                <h2 [class]="styles.caption">
                                    {{ group.label }} — {{ people.length }}
                                </h2>
                                <ul [class]="styles.people">
                                    @for (m of people; track m.id) {
                                        <li [class]="styles.person">
                                            <span aria-hidden="true" [class]="styles.face(m.tone)">
                                                {{ initials(m.name) }}
                                            </span>
                                            <span [class]="styles.who">
                                                <span [class]="styles.name">{{ m.name }}</span>
                                                <span [class]="styles.role">{{ m.title }}</span>
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                [class]="styles.presence(m.presence)"
                                            ></span>
                                        </li>
                                    }
                                </ul>
                            </div>
                        }
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class ChatThread {
    protected readonly styles = styles;
    protected readonly channels = CHANNELS;
    protected readonly presences = PRESENCES;
    protected readonly authorOf = authorOf;
    protected readonly initials = initials;
    protected readonly repliesLabel = repliesLabel;
    protected readonly splitterRef = createSplitterRef();
    protected readonly channelId = signal<ChannelId>("design");
    protected readonly threadId = signal<string | undefined>(undefined);
    private readonly seen = signal<ChannelId[]>(["design"]);
    // what you posted, by channel id or by the id of the message whose thread it answers
    private readonly posted = signal<Record<string, Post[]>>({});
    protected readonly channel = computed(
        () => CHANNELS.find((c) => c.id === this.channelId()) ?? CHANNELS[0],
    );
    protected readonly messages = computed(() => [
        ...MESSAGES.filter((m) => m.channel === this.channelId()),
        ...(this.posted()[this.channelId()] ?? []),
    ]);
    protected readonly thread = computed(() =>
        MESSAGES.find((m) => m.id === this.threadId()),
    );

    protected repliesOf(id: string): Post[] {
        return [
            ...(MESSAGES.find((m) => m.id === id)?.replies ?? []),
            ...(this.posted()[id] ?? []),
        ];
    }

    /** the message a thread starts from, then its replies */
    protected threadPosts(thread: Post): Post[] {
        return [thread, ...this.repliesOf(thread.id)];
    }

    protected unread(id: ChannelId) {
        return this.seen().includes(id)
            ? undefined
            : CHANNELS.find((c) => c.id === id)?.unread;
    }

    protected membersBy(presence: Presence) {
        return MEMBERS.filter((m) => m.presence === presence);
    }

    protected openChannel(id: ChannelId) {
        this.channelId.set(id);
        this.threadId.set(undefined);
        if (!this.seen().includes(id)) this.seen.update((ids) => [...ids, id]);
    }

    protected post(key: string, event: Event) {
        const text = take(event);
        if (!text) return;
        this.posted.update((posted) => ({
            ...posted,
            [key]: [
                ...(posted[key] ?? []),
                {
                    id: `${key}-${(posted[key]?.length ?? 0) + 1}`,
                    authorId: ME,
                    time: "Just now",
                    text,
                },
            ],
        }));
    }
}
