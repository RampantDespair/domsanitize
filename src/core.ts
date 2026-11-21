import type { DomWindow } from "./lib/dom/environment";
import type { SchemaOptions } from "./types/schema";

import { createDomEnvironment } from "./lib/dom/environment";
import { enforceWithEnvironment } from "./lib/enforce";

export type { DomWindow } from "./lib/dom/environment";
export type { SchemaOptions } from "./types/schema";

/** Bind synchronous schema enforcement to a browser or jsdom window. */
export function createEnforcer(window: DomWindow): (html: string, options: SchemaOptions) => string {
  const environment = createDomEnvironment(window);
  return (html, options) => {
    return enforceWithEnvironment(html, options, environment);
  };
}
