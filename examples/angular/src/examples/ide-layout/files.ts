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
    { path: "src/main.ts", name: "main.ts", depth: 1 },
    {
        path: "src/workbench.ts",
        name: "workbench.ts",
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
export const ACTIVE = "workbench.ts";

export const CODE = `import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";

@Component({
    selector: "app-workbench",
    imports: [SPLITTER],
    template: \`
        <div splitterGroup id="ide">
            <div splitterPanel id="explorer" minSize="10rem" collapsible></div>
            <div splitterSeparator aria-label="Resize explorer"></div>
            <div splitterPanel id="workspace"></div>
        </div>
    \`,
})
export class Workbench {}`;

export const OUTLINE = ["Workbench", "Explorer", "Workspace", "Terminal"];

export const TERMINAL = `$ pnpm test
 ✓ layout (24 tests)
 ✓ keyboard (11 tests)
 Test Files  2 passed
$ █`;
