import type { ExampleMeta } from "../meta-types";

export default {
    title: "Observability console",
    description:
        "A live console in three nested groups: a services rail, latency and error charts over a streaming log tail, and a trace inspector. Resizing reflows the charts and the logs while they stream, the side panels collapse, and the layout is saved.",
    category: "apps",
    order: 6,
    features: [
        "nested groups",
        "collapsible",
        "px and rem constraints",
        "persistence",
        "group.reset",
        "external ref",
        "live data",
    ],
    docs: "/docs/guides/nested-groups",
    layout: "fill",
    height: 600,
} satisfies ExampleMeta;
