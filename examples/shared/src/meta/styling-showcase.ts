import type { ExampleMeta } from "../meta-types";

export default {
    title: "Styling showcase",
    description:
        "Separators drawn as hairlines with a grip, a wider hit area, hover and drag colours and the cursor, all from data attributes and the theme's tokens.",
    category: "styling",
    order: 2,
    features: [
        "data-orientation",
        "data-dragging",
        "data-disabled",
        "--sp-* tokens",
        "className function",
    ],
    docs: "/docs/guides/styling",
} satisfies ExampleMeta;
