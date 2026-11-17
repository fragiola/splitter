import type { ExampleMeta } from "../meta-types";

export default {
    title: "Size readout",
    description:
        "A badge on the separator shows the size of the panel before it, read from the model, while the separator is dragged or focused.",
    category: "styling",
    order: 7,
    features: [
        "panel-size-by",
        "useSplitterState",
        "data-dragging",
        "focus-visible",
    ],
    docs: "/docs/guides/styling-css",
} satisfies ExampleMeta;
