/**
 * Whether two flat records (a selection of the model, a layout) hold the same values: what decides
 * that a part does not re-render, or that a layout did not change.
 */
export function shallowEqual(
    a: Readonly<Record<string, unknown>> | undefined,
    b: Readonly<Record<string, unknown>> | undefined,
): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
    );
}
