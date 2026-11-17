import type { ExampleMeta } from "../meta-types";

export default {
    title: "Undo and redo",
    description:
        "Every drag, key press and collapse is a step: undo and redo them with the buttons or Ctrl+Z and Ctrl+Shift+Z.",
    category: "model-api",
    order: 3,
    features: ["model.subscribe", "group.set-layout", "batch", "_kit/undo.ts"],
    docs: "/docs/guides/undo-redo",
} satisfies ExampleMeta;
