import type {
    PanelAddPayload,
    SplitterEngine,
    SplitterModel,
} from "@fragiola/splitter";

/**
 * What one mounted `Splitter.Group` keeps for its parts: the panels waiting for the group to
 * register (React runs a child's effects before its parent's, and `panel.add` needs its group), and
 * its separator elements with the separator id the engine gave each.
 */
export class GroupRegistry {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly groupId: string;
    private readonly queue = new Map<string, PanelAddPayload>();
    private readonly separators = new Map<object, HTMLElement>();
    private ids = new Map<object, string | undefined>();
    private readonly listeners = new Set<() => void>();
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
        if (!this.registered()) {
            this.queue.set(String(payload.id), payload);
            return;
        }
        this.model.run("panel.add", payload);
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
            this.model.run("panel.remove", { panelId });
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
