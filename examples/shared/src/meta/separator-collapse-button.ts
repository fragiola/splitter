import type { ExampleMeta } from "../meta-types";

export default {
    title: "Collapse button",
    description:
        "A button on the separator collapses and expands the panel before it through the model; its icon follows the panel's data-collapsed, and pressing it never drags nor resets.",
    category: "styling",
    order: 5,
    features: [
        "panel.collapse",
        "panel.expand",
        "data-collapsed",
        "useSplitterState",
        "content inside a separator",
    ],
    docs: "/docs/guides/styling-css",
} satisfies ExampleMeta;
