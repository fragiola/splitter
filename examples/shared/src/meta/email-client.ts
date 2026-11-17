import type { ExampleMeta } from "../meta-types";

export default {
    title: "Email client",
    description:
        "Folders, a message list and a reader: the folders collapse to an icon rail, the list keeps its width in pixels when the window resizes, and the layout comes back after a reload.",
    category: "apps",
    order: 2,
    features: [
        "collapsible",
        "collapsedSize in rem",
        "preserve-pixel-size",
        "px constraints",
        "splitter-json",
        "localStorage",
    ],
    height: 560,
} satisfies ExampleMeta;
