import type {
    PanelAddPayload,
    SplitterEngine,
    SplitterModel,
} from "@fragiola/splitter";
import { ADAPTER_RUN } from "./adapter-run";

/**
 * What one `[splitterGroup]` keeps for its parts: the panels waiting for the group to register
 * (it registers after the first render, once its panels are initialized, and `panel.add` needs
 * its group), the panels about to come and go, and its separator elements with the separator id
 * the engine gave each. The Vue adapter's, plus the pending changes: Angular destroys a group's
 * child views (an `@for` of panels) before the group, so a panel's removal waits, and a group
 * destroyed meanwhile drops it (`group.remove` takes the panels, and keeps the layout they had);
 * and an `@for` creates a new item's views before it destroys the old ones, so a panel created in
 * a registered group waits too, and the removals go first (a panel replaced in one tick never
 * shares the group with its replacement, as in React). Both wait for the render
 * (`afterNextRender`, before the groups nested in the new panels register) or the next
 * microtask, whichever comes first.
 */
export class GroupRegistry {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly groupId: string;
    private readonly queue = new Map<string, PanelAddPayload>();
    private readonly separators = new Map<object, HTMLElement>();
    private ids = new Map<object, string | undefined>();
    private readonly listeners = new Set<() => void>();
    /** runs the pending changes after the render */
    private readonly schedule: (flush: () => void) => void;
    /** the panels destroyed, removed at the next flush unless the group goes first */
    private readonly removals = new Set<string>();
    /** the panels created in the registered group, added at the next flush, with their directive */
    private readonly adds = new Map<
        string,
        { payload: PanelAddPayload; owner: object }
    >();
    private scheduled = false;
    /** the group registered through this registry (not another group with the same id) */
    private active = false;

    constructor(
        model: SplitterModel,
        engine: SplitterEngine,
        groupId: string,
        schedule: (flush: () => void) => void,
    ) {
        this.model = model;
        this.engine = engine;
        this.groupId = groupId;
        this.schedule = schedule;
        this.subscribe = this.subscribe.bind(this);
    }

    /** whether this group is registered in the model */
    registered(): boolean {
        return (
            this.active &&
            this.model.get("group-by", { id: this.groupId }) !== undefined
        );
    }

    /** the group registered (`true`) or is about to be removed (`false`) */
    setRegistered(registered: boolean): void {
        this.active = registered;
    }

    /** registers a panel at the next flush, or once the group registers */
    addPanel(payload: PanelAddPayload, owner: object): void {
        const id = String(payload.id);
        if (!this.registered()) {
            this.queue.set(id, payload);
            return;
        }
        this.adds.set(id, { payload, owner });
        this.scheduleFlush();
    }

    /** a panel waiting for the group or the next flush, with new props */
    updateQueued(payload: PanelAddPayload): boolean {
        const id = String(payload.id);
        const added = this.adds.get(id);
        if (added) {
            added.payload = payload;
            return true;
        }
        if (!this.queue.has(id)) {
            return false;
        }
        this.queue.set(id, payload);
        return true;
    }

    /** removes a panel now (its id changed); one still waiting is only forgotten */
    removePanel(panelId: string, owner: object): void {
        if (this.queue.delete(panelId) || this.forget(panelId, owner)) {
            return;
        }
        this.remove(panelId);
    }

    /**
     * removes a destroyed panel at the next flush: its group, when it is destroyed too, goes
     * first ({@link cancel}). A panel still waiting is only forgotten.
     */
    removePanelLater(panelId: string, owner: object): void {
        if (
            this.queue.delete(panelId) ||
            this.forget(panelId, owner) ||
            !this.registered()
        ) {
            return;
        }
        this.removals.add(panelId);
        this.scheduleFlush();
    }

    /**
     * runs the pending changes now: the destroyed panels go, then the created ones come (a layout
     * the app sets in the render that changed them names the panels of after it)
     */
    flush(): void {
        this.scheduled = false;
        const removals = [...this.removals];
        const adds = [...this.adds.values()];
        this.removals.clear();
        this.adds.clear();
        if (!this.registered()) {
            return;
        }
        for (const panelId of removals) {
            this.remove(panelId);
        }
        if (adds.length === 0) {
            return;
        }
        for (const { payload } of adds) {
            this.model.run("panel.add", payload, ADAPTER_RUN);
        }
        this.engine.adapter.syncOrder(this.groupId);
        this.sync();
    }

    /** forgets the pending changes: the group is about to go, with its panels */
    cancel(): void {
        this.removals.clear();
        this.adds.clear();
        this.scheduled = false;
    }

    private scheduleFlush(): void {
        if (this.scheduled) {
            return;
        }
        this.scheduled = true;
        const run = () => {
            if (this.scheduled) {
                this.flush();
            }
        };
        this.schedule(run);
        queueMicrotask(run);
    }

    /** the panel's own add, still pending, is dropped: it never reached the model */
    private forget(panelId: string, owner: object): boolean {
        if (this.adds.get(panelId)?.owner !== owner) {
            return false;
        }
        this.adds.delete(panelId);
        return true;
    }

    private remove(panelId: string): void {
        if (
            this.model.get("panel-by", { id: panelId })?.groupId ===
            this.groupId
        ) {
            this.model.run("panel.remove", { panelId }, ADAPTER_RUN);
        }
    }

    /** the panels waiting for the group, in the order they mounted; the queue is emptied */
    takeQueue(): PanelAddPayload[] {
        const queued = [...this.queue.values()];
        this.queue.clear();
        return queued;
    }

    /** sets (or, with `null`, removes) a separator's element */
    setSeparator(token: object, element: HTMLElement | null): void {
        if (element) {
            this.separators.set(token, element);
        } else {
            this.separators.delete(token);
        }
        if (this.registered()) {
            this.sync();
        }
    }

    /** the separator id of a separator element, once the group is registered */
    separatorId(token: object): string | undefined {
        return this.ids.get(token);
    }

    /** binds the separator elements to the group's separators, by document position */
    sync(): void {
        const tokens = [...this.separators.keys()];
        const elements = [...this.separators.values()];
        // an unregistered group has no separators: every element is unbound
        const assigned = this.engine.adapter.syncSeparators(
            this.groupId,
            this.registered() ? elements : [],
        );
        const ids = new Map<object, string | undefined>();
        tokens.forEach((token, index) => {
            ids.set(token, assigned[index]);
        });
        const changed =
            ids.size !== this.ids.size ||
            [...ids].some(([token, id]) => this.ids.get(token) !== id);
        this.ids = ids;
        if (changed) {
            for (const listener of [...this.listeners]) {
                listener();
            }
        }
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}
