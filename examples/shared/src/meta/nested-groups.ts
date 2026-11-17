import type { ExampleMeta } from "../meta-types";

export default {
    title: "Nested groups",
    description:
        "A sidebar beside an editor that sits above a terminal: a group inside a panel joins its parent's model, and each separator resizes its own group only.",
    category: "layouts",
    order: 1,
    features: ["nested Splitter.Group", "one model", "data-splitter-path"],
    docs: "/docs/concepts/nesting",
} satisfies ExampleMeta;
