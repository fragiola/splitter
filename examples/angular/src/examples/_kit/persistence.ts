// Saving a splitter's layout in the browser: app policy, never the package's. Copy this file and
// change it freely. Every access is guarded: storage may be blocked, full or private.
//
// What is saved is the model's JSON document, `model.get("splitter-json")`: every group's layout,
// the collapsed panels and the size each one expands back to. `createSplitterModel(json)` restores
// it; panels the document does not name take their `defaultSize`. Constraints are not saved: they
// come back with the markup.

/** The value saved under `key`, or `undefined` (nothing saved, unreadable, or not JSON). */
export function load<T>(key: string): T | undefined {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
        return undefined;
    }
}

/** Saves `value` under `key` as JSON; says whether it could. */
export function save(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/** Forgets what is saved under `key`. */
export function forget(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // nothing saved, nothing to forget
    }
}
