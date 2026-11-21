import type { DomEnvironment } from "./environment";

import { JSDOM } from "jsdom";

import { createDomEnvironment } from "./environment";

/** Creates a Node DOM environment with script execution and resource loading disabled. */
export function createNodeDomEnvironment(): DomEnvironment {
  const { window } = new JSDOM("");
  return createDomEnvironment(window);
}
