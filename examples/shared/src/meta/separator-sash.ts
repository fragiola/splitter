import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sash",
    description:
        "A code editor's sash: a 1px line at rest that thickens and takes the accent colour after a short hover delay and while dragging, over a hit area that never changes.",
    category: "styling",
    order: 4,
    features: [
        "data-dragging",
        "transition-delay",
        "hit area",
        "--sp-* tokens",
    ],
    docs: "/docs/guides/styling-css",
} satisfies ExampleMeta;
