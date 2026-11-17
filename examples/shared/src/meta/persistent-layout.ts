import type { ExampleMeta } from "../meta-types";

export default {
    title: "Persistent layout",
    description:
        "Resize the panels and reload: the layout comes back from localStorage, saved as the model's JSON document on every commit.",
    category: "model-api",
    order: 2,
    features: [
        "splitter-json",
        "createSplitterModel(json)",
        "onLayoutCommit",
        "localStorage",
    ],
    docs: "/docs/guides/persistence",
} satisfies ExampleMeta;
