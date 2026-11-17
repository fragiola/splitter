import type { ExampleMeta } from "../meta-types";

export default {
    title: "Basic horizontal",
    description:
        "Three panels side by side: drag a separator to resize its neighbours, double click it to put its panel back to its default size.",
    category: "getting-started",
    order: 1,
    features: [
        "Splitter.Group",
        "Splitter.Panel",
        "Splitter.Separator",
        "defaultSize",
        "double click to reset",
    ],
    docs: "/docs/getting-started/first-splitter",
} satisfies ExampleMeta;
