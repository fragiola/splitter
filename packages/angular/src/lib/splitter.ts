import { SplitterGroup } from "./directives/group.directive";
import { SplitterPanel } from "./directives/panel.directive";
import { SplitterSeparator } from "./directives/separator.directive";

/**
 * Every Splitter directive, for a standalone component's `imports` (React's and Vue's `Splitter`
 * namespace): `@Component({ imports: [SPLITTER], … })`.
 */
export const SPLITTER = [
    SplitterGroup,
    SplitterPanel,
    SplitterSeparator,
] as const;
