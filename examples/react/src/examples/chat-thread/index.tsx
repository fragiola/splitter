"use client";

import {
    Splitter,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import { Hash, MessagesSquare, SendHorizontal, Users, X } from "lucide-react";
import { type FormEvent, Fragment, useState } from "react";
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
import * as styles from "./styles";

const PRESENCES: { presence: Presence; label: string }[] = [
    { presence: "online", label: "Online" },
    { presence: "away", label: "Away" },
    { presence: "offline", label: "Offline" },
];

/** The text of a message box, cleared once read. */
function take(event: FormEvent<HTMLFormElement>): string {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("text") ?? "").trim();
    form.reset();
    return text;
}

// A team chat: channels, the conversation, a thread and the members. The thread panel is rendered
// only while a thread is open, between the conversation and the members, where the markup puts
// it; the group remembers the layout of each set of panels, so a thread opened again comes back
// at the size the user gave it. The members collapse from the header's toggle (an external ref,
// read back with `useSplitterState`). The channels have constraints in rem.
export default function ChatThread() {
    const splitterRef = useSplitterRef();
    const [channelId, setChannelId] = useState<ChannelId>("design");
    const [threadId, setThreadId] = useState<string | undefined>();
    const [seen, setSeen] = useState<ChannelId[]>(["design"]);
    // what you posted, by channel id or by the id of the message whose thread it answers
    const [posted, setPosted] = useState<Record<string, Post[]>>({});
    const channel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0];
    const messages = [
        ...MESSAGES.filter((m) => m.channel === channelId),
        ...(posted[channelId] ?? []),
    ];
    const thread = MESSAGES.find((m) => m.id === threadId);
    const repliesOf = (id: string) => [
        ...(MESSAGES.find((m) => m.id === id)?.replies ?? []),
        ...(posted[id] ?? []),
    ];
    function openChannel(id: ChannelId) {
        setChannelId(id);
        setThreadId(undefined);
        if (!seen.includes(id)) setSeen([...seen, id]);
    }
    function post(key: string, event: FormEvent<HTMLFormElement>) {
        const text = take(event);
        if (!text) return;
        const id = `${key}-${(posted[key]?.length ?? 0) + 1}`;
        setPosted({
            ...posted,
            [key]: [
                ...(posted[key] ?? []),
                { id, authorId: ME, time: "Just now", text },
            ],
        });
    }
    return (
        <div className={styles.frame}>
            <Header splitterRef={splitterRef} />
            <Splitter.Group
                id="chat"
                splitterRef={splitterRef}
                className={styles.group}
            >
                <Splitter.Panel
                    id="channels"
                    defaultSize="14rem"
                    minSize="10rem"
                    maxSize="20rem"
                    className={styles.side}
                >
                    <nav aria-label="Channels" className={styles.nav}>
                        <h2 className={styles.caption}>Channels</h2>
                        {CHANNELS.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                aria-current={
                                    c.id === channelId ? "page" : undefined
                                }
                                data-active={
                                    c.id === channelId ? "" : undefined
                                }
                                data-unread={
                                    c.unread && !seen.includes(c.id)
                                        ? ""
                                        : undefined
                                }
                                onClick={() => openChannel(c.id)}
                                className={styles.channel}
                            >
                                <Hash
                                    aria-hidden="true"
                                    className={styles.hash}
                                />
                                <span className={styles.name}>{c.name}</span>
                                {c.unread && !seen.includes(c.id) ? (
                                    <span className={styles.count}>
                                        {c.unread}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize channels"
                    className={styles.separator}
                />
                <Splitter.Panel id="conversation" minSize="25%">
                    <section aria-label="Conversation" className={styles.pane}>
                        <header className={styles.header}>
                            <div className={styles.heading}>
                                <h2 className={styles.title}>
                                    # {channel?.name}
                                </h2>
                                <p className={styles.topic}>{channel?.topic}</p>
                            </div>
                        </header>
                        <ul className={styles.feed}>
                            {messages.map((m) => {
                                const author = authorOf(m);
                                const count = repliesOf(m.id).length;
                                return (
                                    <li
                                        key={m.id}
                                        data-active={
                                            m.id === threadId ? "" : undefined
                                        }
                                        className={styles.post}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={styles.avatar(
                                                author.tone,
                                            )}
                                        >
                                            {initials(author.name)}
                                        </span>
                                        <p className={styles.byline}>
                                            <span className={styles.author}>
                                                {author.name}
                                            </span>
                                            <span className={styles.time}>
                                                {m.time}
                                            </span>
                                        </p>
                                        <p className={styles.text}>{m.text}</p>
                                        {count > 0 && (
                                            <button
                                                type="button"
                                                aria-expanded={
                                                    m.id === threadId
                                                }
                                                onClick={() =>
                                                    setThreadId(m.id)
                                                }
                                                className={styles.replies}
                                            >
                                                {repliesLabel(count)}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        <form
                            onSubmit={(event) => post(channelId, event)}
                            className={styles.composer}
                        >
                            <input
                                name="text"
                                autoComplete="off"
                                aria-label={`Message #${channel?.name}`}
                                placeholder={`Message #${channel?.name}`}
                                className={styles.input}
                            />
                            <Clickable.Button
                                type="submit"
                                size="sm"
                                variant="icon"
                                shape="square"
                                aria-label="Send"
                                className={styles.send}
                            >
                                <SendHorizontal aria-hidden="true" />
                            </Clickable.Button>
                        </form>
                    </section>
                </Splitter.Panel>
                {thread && (
                    <>
                        <Splitter.Separator
                            aria-label="Resize thread"
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="thread"
                            defaultSize="30%"
                            minSize="20%"
                            maxSize="45%"
                        >
                            <section
                                aria-label="Thread"
                                className={styles.pane}
                            >
                                <header className={styles.header}>
                                    <div className={styles.heading}>
                                        <h2 className={styles.title}>Thread</h2>
                                        <p className={styles.topic}>
                                            # {channel?.name}
                                        </p>
                                    </div>
                                    <Clickable.Button
                                        size="sm"
                                        variant="icon"
                                        shape="square"
                                        aria-label="Close thread"
                                        onClick={() => setThreadId(undefined)}
                                        className={styles.close}
                                    >
                                        <X aria-hidden="true" />
                                    </Clickable.Button>
                                </header>
                                <ul className={styles.feed}>
                                    {[thread, ...repliesOf(thread.id)].map(
                                        (p, index) => {
                                            const author = authorOf(p);
                                            return (
                                                <Fragment key={p.id}>
                                                    <li className={styles.post}>
                                                        <span
                                                            aria-hidden="true"
                                                            className={styles.avatar(
                                                                author.tone,
                                                            )}
                                                        >
                                                            {initials(
                                                                author.name,
                                                            )}
                                                        </span>
                                                        <p
                                                            className={
                                                                styles.byline
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.author
                                                                }
                                                            >
                                                                {author.name}
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.time
                                                                }
                                                            >
                                                                {p.time}
                                                            </span>
                                                        </p>
                                                        <p
                                                            className={
                                                                styles.text
                                                            }
                                                        >
                                                            {p.text}
                                                        </p>
                                                    </li>
                                                    {index === 0 && (
                                                        <li
                                                            className={
                                                                styles.divider
                                                            }
                                                        >
                                                            {repliesLabel(
                                                                repliesOf(
                                                                    thread.id,
                                                                ).length,
                                                            )}
                                                        </li>
                                                    )}
                                                </Fragment>
                                            );
                                        },
                                    )}
                                </ul>
                                <form
                                    onSubmit={(event) => post(thread.id, event)}
                                    className={styles.composer}
                                >
                                    <input
                                        name="text"
                                        autoComplete="off"
                                        aria-label="Reply"
                                        placeholder="Reply…"
                                        className={styles.input}
                                    />
                                    <Clickable.Button
                                        type="submit"
                                        size="sm"
                                        variant="icon"
                                        shape="square"
                                        aria-label="Send reply"
                                        className={styles.send}
                                    >
                                        <SendHorizontal aria-hidden="true" />
                                    </Clickable.Button>
                                </form>
                            </section>
                        </Splitter.Panel>
                    </>
                )}
                <Splitter.Separator
                    aria-label="Resize members"
                    className={styles.separator}
                />
                <Splitter.Panel
                    id="members"
                    defaultSize="13rem"
                    minSize="10rem"
                    maxSize="18rem"
                    collapsible
                    className={styles.side}
                >
                    <section aria-label="Members" className={styles.nav}>
                        {PRESENCES.map(({ presence, label }) => {
                            const people = MEMBERS.filter(
                                (m) => m.presence === presence,
                            );
                            return (
                                <div key={presence}>
                                    <h2 className={styles.caption}>
                                        {label} — {people.length}
                                    </h2>
                                    <ul className={styles.people}>
                                        {people.map((m) => (
                                            <li
                                                key={m.id}
                                                className={styles.person}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={styles.face(
                                                        m.tone,
                                                    )}
                                                >
                                                    {initials(m.name)}
                                                </span>
                                                <span className={styles.who}>
                                                    <span
                                                        className={styles.name}
                                                    >
                                                        {m.name}
                                                    </span>
                                                    <span
                                                        className={styles.role}
                                                    >
                                                        {m.title}
                                                    </span>
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className={styles.presence(
                                                        m.presence,
                                                    )}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

/** The header: the workspace, and a toggle that collapses the member list and expands it back. */
function Header({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    // re-renders when the members collapse or expand, however it happens (a drag, Enter, a click)
    const collapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "members" }),
            { splitterRef },
        ) ?? false;
    function toggle() {
        splitter?.model.run(collapsed ? "panel.expand" : "panel.collapse", {
            panelId: "members",
        });
    }
    return (
        <div role="toolbar" aria-label="Chat" className={styles.toolbar}>
            <span className={styles.workspace}>
                <MessagesSquare aria-hidden="true" className={styles.logo} />
                Product team
            </span>
            <Clickable.Button
                size="sm"
                variant="ghost"
                aria-pressed={!collapsed}
                onClick={toggle}
                className={styles.toggle}
            >
                <Users aria-hidden="true" />
                Members
            </Clickable.Button>
        </div>
    );
}
