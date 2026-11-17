// Sample conversations for the chat: plain data, no network. The channels, the people in them, and
// each channel's messages; a message with replies has a thread.

export type ChannelId = "general" | "design" | "releases" | "random";

export type Presence = "online" | "away" | "offline";

/** The palette an avatar is painted with. */
export type Tone = "blue" | "green" | "orange" | "purple";

export interface Channel {
    id: ChannelId;
    name: string;
    topic: string;
    unread?: number;
}

export interface Member {
    id: string;
    name: string;
    title: string;
    presence: Presence;
    tone: Tone;
}

/** A message or a reply in a thread. */
export interface Post {
    id: string;
    authorId: string;
    time: string;
    text: string;
}

export interface Message extends Post {
    channel: ChannelId;
    replies?: Post[];
}

/** Who "you" are: what you send is posted under this member. */
export const ME = "maya";

export const CHANNELS: Channel[] = [
    {
        id: "general",
        name: "general",
        topic: "Company-wide news and questions",
    },
    {
        id: "design",
        name: "design",
        topic: "Reviews, critiques and the icon set",
        unread: 3,
    },
    {
        id: "releases",
        name: "releases",
        topic: "What ships, and when",
        unread: 1,
    },
    { id: "random", name: "random", topic: "Lunch, links and everything else" },
];

export const MEMBERS: Member[] = [
    {
        id: "maya",
        name: "Maya Lopes",
        title: "Product designer",
        presence: "online",
        tone: "purple",
    },
    {
        id: "ada",
        name: "Ada Moreau",
        title: "Engineering lead",
        presence: "online",
        tone: "blue",
    },
    {
        id: "noor",
        name: "Noor Haddad",
        title: "Accessibility",
        presence: "online",
        tone: "green",
    },
    {
        id: "lucas",
        name: "Lucas Ferreira",
        title: "Front-end",
        presence: "away",
        tone: "orange",
    },
    {
        id: "kenji",
        name: "Kenji Sato",
        title: "Release manager",
        presence: "away",
        tone: "green",
    },
    {
        id: "ines",
        name: "Inès Laurent",
        title: "Writer",
        presence: "offline",
        tone: "blue",
    },
];

export const MESSAGES: Message[] = [
    {
        id: "g1",
        channel: "general",
        authorId: "ada",
        time: "09:02",
        text: "Morning all! The office is closed on Friday for the move; the new desks arrive on Monday.",
        replies: [
            {
                id: "g1r1",
                authorId: "lucas",
                time: "09:10",
                text: "Do we pack our own monitors?",
            },
            {
                id: "g1r2",
                authorId: "ada",
                time: "09:12",
                text: "Yes, boxes are by the kitchen. Label them with your name.",
            },
        ],
    },
    {
        id: "g2",
        channel: "general",
        authorId: "ines",
        time: "10:30",
        text: "The handbook has a new page on time off. Feedback welcome.",
    },
    {
        id: "d1",
        channel: "design",
        authorId: "noor",
        time: "09:41",
        text: "Pushed the new focus rings to the review board. They are 2px everywhere now and never rely on colour alone.",
        replies: [
            {
                id: "d1r1",
                authorId: "maya",
                time: "09:45",
                text: "Love it. Can we try an offset on the dense lists? The ring touches the text.",
            },
            {
                id: "d1r2",
                authorId: "noor",
                time: "09:52",
                text: "Good catch: a 2px offset on list items, inset on the editor tabs.",
            },
            {
                id: "d1r3",
                authorId: "ada",
                time: "10:05",
                text: "The separators too, please: a focused separator should be obvious from across the room.",
            },
        ],
    },
    {
        id: "d2",
        channel: "design",
        authorId: "lucas",
        time: "10:14",
        text: "The panels resize smoothly now. Drag the separators in the prototype and tell me if anything feels sticky.",
    },
    {
        id: "d3",
        channel: "design",
        authorId: "maya",
        time: "10:20",
        text: "Icon set v2 is in the shared drive: 1.5px strokes, a 16px variant for each.",
        replies: [
            {
                id: "d3r1",
                authorId: "lucas",
                time: "10:31",
                text: "Swapping them in the toolbar this afternoon.",
            },
            {
                id: "d3r2",
                authorId: "kenji",
                time: "10:40",
                text: "Will they make Thursday's release?",
            },
            {
                id: "d3r3",
                authorId: "maya",
                time: "10:41",
                text: "If the review passes tomorrow, yes.",
            },
            {
                id: "d3r4",
                authorId: "kenji",
                time: "10:43",
                text: "Noted in the release checklist.",
            },
        ],
    },
    {
        id: "d4",
        channel: "design",
        authorId: "ada",
        time: "11:02",
        text: "Critique at 3pm: bring the empty states and the collapsed sidebar.",
    },
    {
        id: "r1",
        channel: "releases",
        authorId: "kenji",
        time: "08:30",
        text: "0.4 is tagged. Release notes go out at noon.",
        replies: [
            {
                id: "r1r1",
                authorId: "ines",
                time: "08:45",
                text: "Notes are proofread; two links still point at the old guide.",
            },
        ],
    },
    {
        id: "r2",
        channel: "releases",
        authorId: "ada",
        time: "09:15",
        text: "Nightly build passed: 412 tests, 6 minutes.",
    },
    {
        id: "x1",
        channel: "random",
        authorId: "lucas",
        time: "12:01",
        text: "The new place across the street opens on Thursday. Lunch at 12:30?",
        replies: [
            {
                id: "x1r1",
                authorId: "noor",
                time: "12:04",
                text: "I'm in.",
            },
            {
                id: "x1r2",
                authorId: "maya",
                time: "12:06",
                text: "Same, save me a seat.",
            },
        ],
    },
];

/** The member who wrote a post (a placeholder for someone who left). */
export function authorOf(post: Post): Member {
    return (
        MEMBERS.find((m) => m.id === post.authorId) ?? {
            id: post.authorId,
            name: "Former member",
            title: "",
            presence: "offline",
            tone: "blue",
        }
    );
}

/** The two letters of an avatar. */
export function initials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
}

/** "1 reply", "3 replies". */
export function repliesLabel(count: number): string {
    return count === 1 ? "1 reply" : `${count} replies`;
}
