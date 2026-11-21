import type { DomEnvironment } from "./lib/dom/environment";
import type { SchemaOptions } from "./types/schema";

import { createBrowserDomEnvironment } from "./lib/dom/browser";
import { enforceWithEnvironment } from "./lib/enforce";

export { createEnforcer } from "./core";
export type { DomWindow, SchemaOptions } from "./core";

let environment: DomEnvironment | undefined;

/** Enforce an HTML fragment using the browser's DOM implementation. */
export function enforceHtml(html: string, options: SchemaOptions): string {
  if (html === "") {
    return "";
  }

  environment ??= createBrowserDomEnvironment();
  return enforceWithEnvironment(html, options, environment);
}
