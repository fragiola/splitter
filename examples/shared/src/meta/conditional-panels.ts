import type { ExampleMeta } from "../meta-types";

export default {
    title: "Conditional panels",
    description:
        "Show and hide the sidebar and the inspector: a panel rendered conditionally lands where it is in the markup, and the group remembers the sizes of each set of panels.",
    category: "layouts",
    order: 2,
    features: ["conditional rendering", "document order", "layout memory"],
    docs: "/docs/guides/conditional-panels",
} satisfies ExampleMeta;
