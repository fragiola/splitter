import type { ExampleMeta } from "../meta-types";

export default {
    title: "Fixed-size panels",
    description:
        "Resize the window around the group: the sidebar keeps its width in pixels while the editor takes up the change.",
    category: "constraints",
    order: 2,
    features: [
        "groupResizeBehavior",
        "preserve-pixel-size",
        "preserve-relative-size",
    ],
    docs: "/docs/concepts/sizes-and-units",
} satisfies ExampleMeta;
