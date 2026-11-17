// Sample mail for the email client: plain data, no network. The folders, then the messages that
// sit in them; each message names its folder.

export type FolderId = "inbox" | "starred" | "sent" | "drafts" | "archive";

export interface Folder {
    id: FolderId;
    label: string;
}

export interface Message {
    id: string;
    folder: FolderId;
    from: string;
    to: string;
    subject: string;
    date: string;
    unread?: boolean;
    body: string[];
}

export const FOLDERS: Folder[] = [
    { id: "inbox", label: "Inbox" },
    { id: "starred", label: "Starred" },
    { id: "sent", label: "Sent" },
    { id: "drafts", label: "Drafts" },
    { id: "archive", label: "Archive" },
];

export const MESSAGES: Message[] = [
    {
        id: "m1",
        folder: "inbox",
        from: "Ada Moreau",
        to: "me",
        subject: "Release notes for 0.4",
        date: "09:42",
        unread: true,
        body: [
            "Hi,",
            "The release notes for 0.4 are ready for a last read. I moved the breaking changes to the top and added a short migration section for the renamed options.",
            "Could you check the examples links before noon? Two of them still point at the old guide.",
            "Thanks, Ada",
        ],
    },
    {
        id: "m2",
        folder: "inbox",
        from: "Build server",
        to: "me",
        subject: "Nightly build passed",
        date: "07:15",
        unread: true,
        body: [
            "All 412 tests passed on the main branch.",
            "Duration: 6 min 12 s. Artifacts are kept for seven days.",
        ],
    },
    {
        id: "m3",
        folder: "inbox",
        from: "Lucas Ferreira",
        to: "me",
        subject: "Lunch on Thursday?",
        date: "Yesterday",
        body: [
            "Hey! The new place across the street opens on Thursday. Want to try it around 12:30?",
            "Lucas",
        ],
    },
    {
        id: "m4",
        folder: "inbox",
        from: "Design team",
        to: "everyone",
        subject: "Updated icon set",
        date: "Mon",
        body: [
            "Hello all,",
            "The updated icon set is in the shared drive. Strokes are 1.5px everywhere now, and every icon has a 16px variant.",
            "Please replace the old exports in your projects by the end of the month.",
        ],
    },
    {
        id: "m5",
        folder: "inbox",
        from: "Noor Haddad",
        to: "me",
        subject: "Re: Keyboard shortcuts",
        date: "Sun",
        body: [
            "Agreed on F6 to move between the panes. Enter to collapse feels right too.",
            "I wrote the help page; it needs a screenshot of the collapsed rail.",
        ],
    },
    {
        id: "m6",
        folder: "starred",
        from: "Ada Moreau",
        to: "me",
        subject: "Roadmap for the next quarter",
        date: "Oct 28",
        body: [
            "Here is the roadmap we discussed: themes first, then the new examples, then the docs pass.",
            "Let me know if anything is missing.",
        ],
    },
    {
        id: "m7",
        folder: "sent",
        from: "me",
        to: "Noor Haddad",
        subject: "Keyboard shortcuts",
        date: "Sat",
        body: [
            "Hi Noor,",
            "What do you think of F6 to cycle the panes, and Enter on a separator to collapse its panel?",
        ],
    },
    {
        id: "m8",
        folder: "drafts",
        from: "me",
        to: "Design team",
        subject: "Feedback on the rail",
        date: "Fri",
        body: [
            "The collapsed rail could show a count next to the inbox icon, as a dot.",
        ],
    },
    {
        id: "m9",
        folder: "archive",
        from: "Lucas Ferreira",
        to: "me",
        subject: "Conference slides",
        date: "Sep 12",
        body: ["The slides from the conference, as promised. See you soon!"],
    },
];
