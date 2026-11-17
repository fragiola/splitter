import type { ExampleMeta } from "../meta-types";

export default {
    title: "Markdown editor",
    description:
        "An editor beside its live preview: Editor, Split and Preview modes driven through the model API, and a switch that stacks the two panes without losing their sizes.",
    category: "apps",
    order: 3,
    features: [
        "external ref",
        "panel.collapse",
        "panel.expand",
        "batch",
        "orientation",
        "useSplitterState",
    ],
    height: 560,
} satisfies ExampleMeta;
