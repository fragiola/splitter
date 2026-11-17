import type { ExampleMeta } from "../meta-types";

export default {
    title: "Database console",
    description:
        "A schema tree beside a SQL editor stacked above its results: the results collapse from the toolbar or with Enter on their separator, Run brings them back, and Reset restores the default layout.",
    category: "apps",
    order: 5,
    features: [
        "nested groups",
        "collapsible",
        "px and rem constraints",
        "group.reset",
        "batch",
        "external ref",
    ],
    height: 560,
} satisfies ExampleMeta;
