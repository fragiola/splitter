import type { ExampleMeta } from "../meta-types";

export default {
    title: "Vertical",
    description:
        "An editor above a terminal: a vertical group stacks its panels and its separators drag up and down.",
    category: "getting-started",
    order: 2,
    features: ['orientation="vertical"', "aria-orientation", "minSize"],
    docs: "/docs/getting-started/first-splitter",
} satisfies ExampleMeta;
