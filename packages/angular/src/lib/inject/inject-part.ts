// The state of the part around the code that calls them: a group's, a panel's, a separator's. The
// directive puts the attributes and the style on its element; these hand its state to a component
// inside it (React's `useGroup`, `usePanel`, `useSeparator`, without the registration: in Angular
// the directive on the element is the lower layer).

import { inject, type Signal } from "@angular/core";
import {
    type GroupPartState,
    SplitterGroup,
} from "../directives/group.directive";
import {
    type PanelPartState,
    SplitterPanel,
} from "../directives/panel.directive";
import {
    type SeparatorPartState,
    SplitterSeparator,
} from "../directives/separator.directive";

/** What a part's injection function returns: the part's state, as a signal. */
export interface InjectPartResult<S> {
    readonly state: Signal<S>;
}

function enclosing<D>(directive: D | null, part: string, fn: string): D {
    if (!directive) {
        throw new Error(`${fn} must be used inside [${part}]`);
    }
    return directive;
}

/** The state of the enclosing `[splitterGroup]` (`orientation`, `dragging`, `path`, …). */
export function injectGroup(): InjectPartResult<GroupPartState> {
    const group = enclosing(
        inject(SplitterGroup, { optional: true }),
        "splitterGroup",
        "injectGroup",
    );
    return { state: group.state };
}

/** The state of the enclosing `[splitterPanel]` (`size`, `collapsed`, `path`, …). */
export function injectPanel(): InjectPartResult<PanelPartState> {
    const panel = enclosing(
        inject(SplitterPanel, { optional: true }),
        "splitterPanel",
        "injectPanel",
    );
    return { state: panel.state };
}

/** The state of the enclosing `[splitterSeparator]` (`id`, `dragging`, `disabled`, …). */
export function injectSeparator(): InjectPartResult<SeparatorPartState> {
    const separator = enclosing(
        inject(SplitterSeparator, { optional: true }),
        "splitterSeparator",
        "injectSeparator",
    );
    return { state: separator.state };
}
