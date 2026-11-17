import { Component } from "@angular/core";
import { SPLITTER } from "@fragiola/splitter-angular";
import * as styles from "./styles";

// The group follows the inline direction it inherits: under `dir="rtl"` its first panel starts at
// the right. A drag toward the start (right) shrinks the panel before the separator, and so does
// the arrow pointing that way: RTL is a mirror, not a separate layout. Sides in the styles are
// logical (`ps-`, `border-s-`), so nothing else changes.
@Component({
    selector: "example-rtl-layout",
    imports: [SPLITTER],
    host: { class: "contents" },
    template: `
        <div dir="rtl" lang="ar" [class]="styles.frame">
            <div splitterGroup [class]="styles.group">
                <div splitterPanel id="folders" defaultSize="25%" minSize="15%">
                    <section aria-label="Folders" [class]="styles.panel">
                        <h2 [class]="styles.title">المجلدات</h2>
                        <p [class]="styles.text">The first panel, at the right.</p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize folders"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="messages" defaultSize="35%" minSize="20%">
                    <section aria-label="Messages" [class]="styles.panel">
                        <h2 [class]="styles.title">الرسائل</h2>
                        <p [class]="styles.text">
                            ← grows the panel before the separator.
                        </p>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize messages"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="reading" minSize="20%">
                    <section aria-label="Reading pane" [class]="styles.panel">
                        <h2 [class]="styles.title">القراءة</h2>
                        <p [class]="styles.text">The last panel, at the left.</p>
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class RtlLayout {
    protected readonly styles = styles;
}
