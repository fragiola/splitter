import type { ExampleMeta } from "../meta-types";

export default {
    title: "Controlled from code",
    description:
        "Buttons outside the group resize, collapse and reset its panels through an external ref, and a readout follows the layout.",
    category: "model-api",
    order: 1,
    features: [
        "useSplitterRef",
        "useSplitter(splitterRef)",
        "panel.resize",
        "group.reset",
        "layout-by",
    ],
    docs: "/docs/guides/from-code",
} satisfies ExampleMeta;
