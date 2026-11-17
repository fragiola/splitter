import type { ExampleMeta } from "../meta-types";

export default {
    title: "Keyboard",
    description:
        "Focus a separator with Tab: the arrows resize, Home and End go to the limits, Enter collapses the panel before it, F6 moves to the next separator.",
    category: "keyboard",
    order: 1,
    features: [
        "Window Splitter",
        "aria-valuenow",
        "Home and End",
        "Enter",
        "F6",
    ],
    docs: "/docs/guides/keyboard",
} satisfies ExampleMeta;
