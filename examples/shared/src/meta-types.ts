// From Dockable (fragiola/dockable, examples/shared/src/meta-types.ts), same author and licence.
// The shape of an example's metadata (src/meta/<slug>.ts, shared by every framework). Site-internal:
// examples never import this from their code, only their metadata does. The fields map onto an
// entry of the site export's manifest.json (scripts/manifest.ts).
//
// The gallery groups examples by category: the feature they show. The site export contract (v1.2)
// calls a category a `level`: `examples.json` lists CATEGORIES as its `levels`, and each manifest
// entry's `level` is its category's id (scripts/manifest.ts).

/** The gallery's groups, in the order the sidebar lists them. */
export const CATEGORIES = [
    "getting-started",
    "layouts",
    "constraints",
    "collapsing",
    "keyboard",
    "styling",
    "model-api",
    "apps",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_TITLES: Record<Category, string> = {
    "getting-started": "Getting started",
    layouts: "Layouts",
    constraints: "Constraints",
    collapsing: "Collapsing",
    keyboard: "Keyboard",
    styling: "Styling",
    "model-api": "Model API",
    apps: "Apps",
};

export interface ExampleMeta {
    /** the example's name in the sidebar and the page title */
    title: string;
    /** one or two sentences: what it shows */
    description: string;
    /** the feature it shows: its group in the gallery */
    category: Category;
    /** position inside its category, ascending */
    order: number;
    /** the APIs and techniques it shows, as short tags */
    features: string[];
    /** the docs page it belongs to, e.g. "/docs/guides/persistence" */
    docs?: string;
    /**
     * How the site sizes its frame. `"fill"` (the default): the example fills a frame
     * of `height`. `"flow"`: the frame grows with the content, `height` is its floor.
     */
    layout?: ExampleLayout;
    /** the frame height in pixels (default: {@link DEFAULT_HEIGHT} for its category) */
    height?: number;
}

export const LAYOUTS = ["fill", "flow"] as const;

export type ExampleLayout = (typeof LAYOUTS)[number];

/** The frame height of an example that names none. */
export const DEFAULT_HEIGHT: Record<Category, number> = {
    "getting-started": 360,
    layouts: 420,
    constraints: 400,
    collapsing: 420,
    keyboard: 380,
    styling: 400,
    "model-api": 440,
    apps: 560,
};
