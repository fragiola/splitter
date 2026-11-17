/**
 * The options of every command the adapter runs for the markup (registering a group or a panel,
 * a prop that changed, a controlled `layout`): `meta.source` is `"adapter"`, so middleware and
 * listeners tell them from the user's steps and the app's own commands.
 */
export const ADAPTER_RUN = { meta: { source: "adapter" } } as const;
