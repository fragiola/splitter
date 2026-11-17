import type { ExampleMeta } from "../meta-types";

export default {
    title: "Right to left",
    description:
        "The same group in a right-to-left page: the first panel starts at the right, and the arrows and drags are mirrored.",
    category: "styling",
    order: 1,
    features: ['dir="rtl"', "logical sides", "mirrored arrows"],
    docs: "/docs/guides/rtl",
} satisfies ExampleMeta;
