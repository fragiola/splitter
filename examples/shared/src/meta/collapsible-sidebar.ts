import type { ExampleMeta } from "../meta-types";

export default {
    title: "Collapsible sidebar",
    description:
        "Drag the sidebar past its minimum and it collapses to a rail; drag it back, press Enter on the separator or use the button to expand it.",
    category: "collapsing",
    order: 1,
    features: [
        "collapsible",
        "collapsedSize",
        "panel.collapse",
        "panel.expand",
        "data-collapsed",
        "useSplitterState",
    ],
    docs: "/docs/guides/collapsible-panels",
} satisfies ExampleMeta;
