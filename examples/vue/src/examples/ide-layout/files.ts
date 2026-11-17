// The workbench's demo content: a file tree, a file, its outline and a terminal session.

export interface FileEntry {
    path: string;
    name: string;
    /** how deep it sits in the tree */
    depth: number;
    /** the file open in the editor */
    active?: boolean;
}

export const FILES: FileEntry[] = [
    { path: "src", name: "src", depth: 0 },
    { path: "src/app.vue", name: "app.vue", depth: 1 },
    {
        path: "src/workbench.vue",
        name: "workbench.vue",
        depth: 1,
        active: true,
    },
    { path: "src/styles.css", name: "styles.css", depth: 1 },
    { path: "src/lib", name: "lib", depth: 1 },
    { path: "src/lib/layout.ts", name: "layout.ts", depth: 2 },
    { path: "package.json", name: "package.json", depth: 0 },
    { path: "README.md", name: "README.md", depth: 0 },
];

/** The file open in the editor. */
export const ACTIVE = "workbench.vue";

export const CODE = `<script setup lang="ts">
import { Splitter } from "@fragiola/splitter-vue";
</script>

<template>
    <Splitter.Group id="ide">
        <Splitter.Panel id="explorer" min-size="10rem" collapsible />
        <Splitter.Separator aria-label="Resize explorer" />
        <Splitter.Panel id="workspace" />
    </Splitter.Group>
</template>`;

export const OUTLINE = ["Workbench", "Explorer", "Workspace", "Terminal"];

export const TERMINAL = `$ pnpm test
 ✓ layout (24 tests)
 ✓ keyboard (11 tests)
 Test Files  2 passed
$ █`;
