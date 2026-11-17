"use client";

import { Splitter } from "@fragiola/splitter-react";
import * as styles from "./styles";

const LINES = [
    "$ pnpm dev",
    "VITE ready in 212 ms",
    "➜ Local: http://localhost:5184/",
];

// A vertical group stacks its panels: the separator between them is horizontal
// (`aria-orientation="horizontal"`), drags up and down, and its arrows are Up and Down.
export default function Vertical() {
    return (
        <div className={styles.frame}>
            <Splitter.Group orientation="vertical" className={styles.group}>
                <Splitter.Panel id="editor" defaultSize="65%" minSize="20%">
                    <section aria-label="Editor" className={styles.panel}>
                        <h2 className={styles.title}>Editor</h2>
                        <p className={styles.text}>
                            Drag the separator up or down.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize editor"
                    className={styles.separator}
                />
                <Splitter.Panel id="terminal" minSize="15%">
                    <section aria-label="Terminal" className={styles.panel}>
                        <h2 className={styles.title}>Terminal</h2>
                        <pre className={styles.code}>{LINES.join("\n")}</pre>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
