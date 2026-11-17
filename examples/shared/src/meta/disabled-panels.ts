import type { ExampleMeta } from "../meta-types";

export default {
    title: "Disabled panels",
    description:
        "A locked panel, a disabled separator and a switch that locks the whole group: what can still move, and what cannot.",
    category: "constraints",
    order: 3,
    features: ["disabled", "Splitter.Separator disabled", "data-disabled"],
    docs: "/docs/guides/size-constraints#disabled-panels-and-separators",
} satisfies ExampleMeta;
