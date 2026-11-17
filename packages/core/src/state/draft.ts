import type { IdKind, IdSource } from "./ids";
import type { GroupJson, GroupState, PanelState, SplitterState } from "./types";

/** Freezes a value and everything it holds (already frozen parts are skipped). */
export function deepFreeze<V>(value: V): V {
    if (
        typeof value === "object" &&
        value !== null &&
        !Object.isFrozen(value)
    ) {
        Object.freeze(value);
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
    }
    return value;
}

/** Whether two entities hold the same values (shallowly): replacing one by the other changes nothing. */
function shallowEqual(a: object | undefined, b: object): boolean {
    if (a === undefined) {
        return false;
    }
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);
    return (
        keys.length === Object.keys(right).length &&
        keys.every(
            (key) => Object.hasOwn(right, key) && left[key] === right[key],
        )
    );
}

/** Sets an own key, even `__proto__` (an id is any string). */
function put<V>(record: Record<string, V>, key: string, value: V): void {
    Object.defineProperty(record, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
    });
}

/**
 * The working copy one command (or one batch) changes. Entities are replaced, never mutated:
 * every one set is frozen, and the commit shares every entity that was not replaced. A commit that
 * replaced nothing returns the state it started from.
 */
export class Draft {
    private readonly base: SplitterState;
    private readonly groups: Record<string, GroupState>;
    private readonly panels: Record<string, PanelState>;
    private readonly pending: Record<string, Readonly<GroupJson>>;
    private changed = false;
    readonly ids: IdSource;

    constructor(base: SplitterState, ids: IdSource) {
        this.base = base;
        this.groups = { ...base.groups };
        this.panels = { ...base.panels };
        this.pending = { ...base.pending };
        this.ids = ids;
    }

    group(id: string): GroupState | undefined {
        return Object.hasOwn(this.groups, id) ? this.groups[id] : undefined;
    }

    panel(id: string): PanelState | undefined {
        return Object.hasOwn(this.panels, id) ? this.panels[id] : undefined;
    }

    pendingGroup(id: string): Readonly<GroupJson> | undefined {
        return Object.hasOwn(this.pending, id) ? this.pending[id] : undefined;
    }

    allGroups(): GroupState[] {
        return Object.values(this.groups);
    }

    /** A fresh id for a new group or panel. */
    newId(kind: IdKind): string {
        return this.ids.next(kind, (id) =>
            kind === "group"
                ? this.group(id) !== undefined
                : this.panel(id) !== undefined,
        );
    }

    setGroup(group: GroupState): GroupState {
        const current = this.group(group.id);
        if (current === group || shallowEqual(current, group)) {
            return current ?? group;
        }
        put(this.groups, group.id, deepFreeze(group));
        this.changed = true;
        return group;
    }

    deleteGroup(id: string): void {
        if (Object.hasOwn(this.groups, id)) {
            delete this.groups[id];
            this.changed = true;
        }
    }

    setPanel(panel: PanelState): PanelState {
        const current = this.panel(panel.id);
        if (current === panel || shallowEqual(current, panel)) {
            return current ?? panel;
        }
        put(this.panels, panel.id, deepFreeze(panel));
        this.changed = true;
        return panel;
    }

    deletePanel(id: string): void {
        if (Object.hasOwn(this.panels, id)) {
            delete this.panels[id];
            this.changed = true;
        }
    }

    deletePending(id: string): void {
        if (Object.hasOwn(this.pending, id)) {
            delete this.pending[id];
            this.changed = true;
        }
    }

    /** The state with every change, or the base state when nothing changed. */
    commit(): SplitterState {
        if (!this.changed) {
            return this.base;
        }
        return deepFreeze({
            groups: { ...this.groups },
            panels: { ...this.panels },
            pending: { ...this.pending },
        });
    }

    /** The state as it is now, uncommitted (what a middleware's `ctx.get` reads inside a batch). */
    snapshot(): SplitterState {
        return {
            groups: this.groups,
            panels: this.panels,
            pending: this.pending,
        };
    }
}
