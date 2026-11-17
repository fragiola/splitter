import type {
    PanelAddPayload,
    SplitterEngine,
    SplitterModel,
} from "@fragiola/splitter";
import { ADAPTER_RUN } from "./adapter-run";

/**
 * What one `[splitterGroup]` keeps for its parts: the panels waiting for the group to register
 * (it registers after the first render, once its panels are initialized, and `panel.add` needs
 * its group), the panels about to go, and its separator elements with the separator id the engine
 * gave each. The Vue adapter's, plus the removals: Angular destroys a group's child views (an
 * `@for` of panels) before the group, so a panel's removal waits for a microtask, and a group
 * destroyed meanwhile drops it (`group.remove` takes the panels, and keeps the layout they had).
 */
export class GroupRegistry {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly groupId: string;
    private readonly queue = new Map<string, PanelAddPayload>();
    private readonly separators = new Map<object, HTMLElement>();
    private ids = new Map<object, string | undefined>();
    private readonly listeners = new Set<() => void>();
    /** the panels destroyed, removed at the next microtask unless the group goes first */
    private readonly removals = new Set<string>();
    private flushing = false;
    /** the group registered through this registry (not another group with the same id) */
    private active = false;

    constructor(model: SplitterModel, engine: SplitterEngine, groupId: string) {
        this.model = model;
        this.engine = engine;
        this.groupId = groupId;
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

    /** registers a panel now, or once the group registers */
    addPanel(payload: PanelAddPayload): void {
        // a panel destroyed and created again under its id (an `@for` that recreated it)
        if (this.removals.delete(String(payload.id))) {
            this.removePanel(String(payload.id));
        }
        if (!this.registered()) {
            this.queue.set(String(payload.id), payload);
            return;
        }
        this.model.run("panel.add", payload, ADAPTER_RUN);
        this.engine.adapter.syncOrder(this.groupId);
        this.sync();
    }

    /** a panel waiting for the group, with new props */
    updateQueued(payload: PanelAddPayload): boolean {
        const id = String(payload.id);
        if (!this.queue.has(id)) {
            return false;
        }
        this.queue.set(id, payload);
        return true;
    }

    removePanel(panelId: string): void {
        this.queue.delete(panelId);
        if (
            this.model.get("panel-by", { id: panelId })?.groupId ===
            this.groupId
        ) {
            this.model.run("panel.remove", { panelId }, ADAPTER_RUN);
        }
    }

    /**
     * removes a destroyed panel at the next microtask: its group, when it is destroyed too, goes
     * first ({@link cancelRemovals}). A panel still waiting for the group goes at once.
     */
    removePanelLater(panelId: string): void {
        if (this.queue.delete(panelId) || !this.registered()) {
            return;
        }
        this.removals.add(panelId);
        if (this.flushing) {
            return;
        }
        this.flushing = true;
        queueMicrotask(() => {
            this.flushing = false;
            this.flushRemovals();
        });
    }

    /**
     * removes the destroyed panels now, before their microtask: a layout the app sets in the
     * render that destroyed them names the panels left
     */
    flushRemovals(): void {
        const removals = [...this.removals];
        this.removals.clear();
        for (const panelId of removals) {
            this.removePanel(panelId);
        }
    }

    /** forgets the removals still waiting: the group is about to go, with its panels */
    cancelRemovals(): void {
        this.removals.clear();
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
