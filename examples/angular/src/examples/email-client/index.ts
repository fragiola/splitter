import { Component, computed, signal } from "@angular/core";
import {
    createSplitterModel,
    createSplitterRef,
    SPLITTER,
    type SplitterJson,
    validateSplitter,
} from "@fragiola/splitter-angular";
import {
    LucideArchive,
    LucideDynamicIcon,
    LucideFileText,
    type LucideIcon,
    LucideInbox,
    LucideSend,
    LucideStar,
} from "@lucide/angular";
import { load, save } from "../_kit/persistence";
import { FOLDERS, type FolderId, MESSAGES } from "./messages";
import * as styles from "./styles";
import { Toolbar } from "./toolbar";

const KEY = "fragiola-splitter:email-client";

const ICONS: Record<FolderId, LucideIcon> = {
    inbox: LucideInbox,
    starred: LucideStar,
    sent: LucideSend,
    drafts: LucideFileText,
    archive: LucideArchive,
};

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// A mail app's three panes. The folders collapse to an icon rail (a `collapsedSize` in rem) by a
// drag or from the toolbar, and hide their labels while collapsed (`in-data-collapsed:`). The
// folders and the message list keep their pixels when the window resizes
// (`preserve-pixel-size`): the reader takes up the change. The layout is the model's JSON
// document, saved on every commit and restored before the first render, as `persistent-layout`.
@Component({
    selector: "example-email-client",
    imports: [SPLITTER, LucideDynamicIcon, Toolbar],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-email-client-toolbar [splitterRef]="splitterRef" />
            <div
                splitterGroup
                id="mail"
                [model]="model"
                [splitterRef]="splitterRef"
                [class]="styles.group"
                (layoutCommit)="persist()"
            >
                <div
                    splitterPanel
                    id="folders"
                    defaultSize="13rem"
                    minSize="10rem"
                    maxSize="30%"
                    collapsible
                    collapsedSize="3.25rem"
                    groupResizeBehavior="preserve-pixel-size"
                    [class]="styles.folders"
                >
                    <nav aria-label="Folders" [class]="styles.nav">
                        @for (item of folders; track item.id) {
                            <button
                                type="button"
                                [attr.aria-label]="item.label"
                                [title]="item.label"
                                [attr.aria-current]="item.id === folder() ? 'page' : null"
                                [attr.data-active]="item.id === folder() ? '' : null"
                                [class]="styles.folder"
                                (click)="openFolder(item.id)"
                            >
                                <svg [lucideIcon]="icons[item.id]" aria-hidden="true" [class]="styles.icon"></svg>
                                <span [class]="styles.label">{{ item.label }}</span>
                                @if (unread(item.id); as count) {
                                    <span aria-hidden="true" [class]="styles.count">{{ count }}</span>
                                }
                            </button>
                        }
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize folders"
                    [class]="styles.separator"
                ></div>
                <div
                    splitterPanel
                    id="messages"
                    [defaultSize]="320"
                    [minSize]="240"
                    [maxSize]="440"
                    groupResizeBehavior="preserve-pixel-size"
                    [class]="styles.list"
                >
                    <section aria-label="Messages" [class]="styles.pane">
                        <h2 [class]="styles.heading">
                            {{ folderLabel() }}
                            <span [class]="styles.total">{{ messages().length }}</span>
                        </h2>
                        <ul [class]="styles.messages">
                            @for (m of messages(); track m.id) {
                                <li>
                                    <button
                                        type="button"
                                        [attr.aria-current]="m.id === selected() ? 'true' : null"
                                        [attr.data-active]="m.id === selected() ? '' : null"
                                        [attr.data-unread]="isUnread(m.id) ? '' : null"
                                        [class]="styles.message"
                                        (click)="open(m.id)"
                                    >
                                        <span [class]="styles.from">{{ m.from }}</span>
                                        <span [class]="styles.date">{{ m.date }}</span>
                                        <span [class]="styles.subject">{{ m.subject }}</span>
                                        <span [class]="styles.snippet">{{ m.body.join(" ") }}</span>
                                    </button>
                                </li>
                            }
                        </ul>
                    </section>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize message list"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="reader" minSize="30%">
                    <article aria-label="Reader" [class]="styles.reader">
                        @if (message(); as message) {
                            <header [class]="styles.header">
                                <h2 [class]="styles.title">{{ message.subject }}</h2>
                                <p [class]="styles.meta">
                                    {{ message.from }} to {{ message.to }} · {{ message.date }}
                                </p>
                            </header>
                            <div [class]="styles.body">
                                @for (paragraph of message.body; track paragraph) {
                                    <p>{{ paragraph }}</p>
                                }
                            </div>
                        } @else {
                            <p [class]="styles.empty">No message selected.</p>
                        }
                    </article>
                </div>
            </div>
        </div>
    `,
})
export default class EmailClient {
    protected readonly styles = styles;
    protected readonly folders = FOLDERS;
    protected readonly icons = ICONS;
    protected readonly model = restore();
    protected readonly splitterRef = createSplitterRef();
    protected readonly folder = signal<FolderId>("inbox");
    protected readonly selected = signal<string | undefined>("m1");
    private readonly read = signal<string[]>(["m1"]);
    protected readonly messages = computed(() =>
        MESSAGES.filter((m) => m.folder === this.folder()),
    );
    protected readonly message = computed(() =>
        this.messages().find((m) => m.id === this.selected()),
    );
    protected readonly folderLabel = computed(
        () => FOLDERS.find((f) => f.id === this.folder())?.label,
    );

    protected persist() {
        save(KEY, this.model.get("splitter-json"));
    }

    protected isUnread(id: string) {
        return MESSAGES.some(
            (m) => m.id === id && m.unread && !this.read().includes(id),
        );
    }

    protected unread(id: FolderId) {
        return MESSAGES.filter((m) => m.folder === id && this.isUnread(m.id))
            .length;
    }

    protected openFolder(id: FolderId) {
        this.folder.set(id);
        this.selected.set(MESSAGES.find((m) => m.folder === id)?.id);
    }

    protected open(id: string) {
        this.selected.set(id);
        if (!this.read().includes(id)) this.read.update((ids) => [...ids, id]);
    }
}
