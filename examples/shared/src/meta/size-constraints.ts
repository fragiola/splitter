import type { ExampleMeta } from "../meta-types";

export default {
    title: "Size constraints",
    description:
        "Minimum and maximum sizes in rem, percent and pixels: a drag stops at the limit, whatever unit the panel declares it in.",
    category: "constraints",
    order: 1,
    features: ["minSize", "maxSize", "rem", "%", "px", "panel-size-by"],
    docs: "/docs/concepts/sizes-and-units",
} satisfies ExampleMeta;
