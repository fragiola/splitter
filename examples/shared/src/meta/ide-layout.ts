import type { ExampleMeta } from "../meta-types";

export default {
    title: "IDE layout",
    description:
        "An editor workbench: a collapsible explorer, editor and outline side by side above a collapsible terminal, three groups in one model.",
    category: "apps",
    order: 1,
    features: [
        "nested groups",
        "collapsible",
        "px and rem constraints",
        "external ref",
        "useSplitterState",
    ],
    height: 560,
} satisfies ExampleMeta;
