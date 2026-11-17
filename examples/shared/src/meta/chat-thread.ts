import type { ExampleMeta } from "../meta-types";

export default {
    title: "Chat with threads",
    description:
        "Channels, a conversation, a thread and the members: the thread panel opens and closes with its thread and comes back at the size it had, and the member list collapses from the header.",
    category: "apps",
    order: 4,
    features: [
        "conditional rendering",
        "layout memory",
        "collapsible",
        "rem constraints",
        "external ref",
        "useSplitterState",
    ],
    height: 560,
} satisfies ExampleMeta;
