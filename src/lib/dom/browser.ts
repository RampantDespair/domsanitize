import type { DomEnvironment } from "./environment";

import { createDomEnvironment } from "./environment";

/** Accesses the browser window only when an environment is requested. */
export function createBrowserDomEnvironment(): DomEnvironment {
  if (typeof window === "undefined") {
    throw new Error("The browser DOM environment requires a window");
  }

  return createDomEnvironment(window);
}
