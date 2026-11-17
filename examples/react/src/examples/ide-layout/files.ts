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
    { path: "src/app.tsx", name: "app.tsx", depth: 1 },
    { path: "src/splitter.tsx", name: "splitter.tsx", depth: 1, active: true },
    { path: "src/styles.css", name: "styles.css", depth: 1 },
    { path: "src/lib", name: "lib", depth: 1 },
    { path: "src/lib/layout.ts", name: "layout.ts", depth: 2 },
    { path: "package.json", name: "package.json", depth: 0 },
    { path: "README.md", name: "README.md", depth: 0 },
];

export const CODE = `import { Splitter } from "@fragiola/splitter-react";

export function Workbench() {
    return (
        <Splitter.Group id="ide">
            <Splitter.Panel id="explorer" minSize="10rem" collapsible />
            <Splitter.Separator aria-label="Resize explorer" />
            <Splitter.Panel id="workspace" />
        </Splitter.Group>
    );
}`;

export const OUTLINE = ["Workbench", "Explorer", "Workspace", "Terminal"];

export const TERMINAL = `$ pnpm test
 ✓ layout (24 tests)
 ✓ keyboard (11 tests)
 Test Files  2 passed
$ █`;
