import type { DomEnvironment } from "./lib/dom/environment";
import type { SchemaOptions } from "./types/schema";

import { createNodeDomEnvironment } from "./lib/dom/node";
import { enforceWithEnvironment } from "./lib/enforce";

export { createEnforcer } from "./core";
export type { DomWindow, SchemaOptions } from "./core";

let environment: DomEnvironment | undefined;

/**
 * Enforces a schema on HTML content by removing or modifying elements and attributes
 * that do not conform to the provided rules.
 *
 * This function parses the input HTML, applies schema rules based on the provided options,
 * and returns a conformed version of the HTML. It handles tag validation, attribute filtering,
 * nesting limits, and error handling according to the configuration.
 *
 * @param html - The HTML string to enforce the schema on
 * @param options - Configuration options that define the schema rules and behavior
 * @returns The conformed HTML string
 *
 * @remarks
 * Output is reparsed and, if its serialization changes, enforced again.
 * Schemas that do not produce stable markup within 10 passes cause an error.
 *
 * @example
 * ```typescript
 * import { enforceHtml } from './index';
 * import type { SchemaOptions } from './types/schema';
 *
 * const options: SchemaOptions = {
 *   preserveComments: false,
 *   errorHandling: {
 *     tag: "discardElement",
 *     attribute: "discardAttribute"
 *   },
 *   tags: {
 *     "div": {
 *       attributes: {
 *         "class": {
 *           mode: "set",
 *           delimiter: " ",
 *           values: ["container", "row", "col"],
 *           maxLength: 100
 *         },
 *         "id": {
 *           mode: "simple",
 *           value: /^[a-zA-Z][a-zA-Z0-9-_]*$/,
 *           required: false
 *         }
 *       },
 *       limits: {
 *         children: 20,
 *         nesting: 5
 *       }
 *     },
 *     "a": {
 *       attributes: {
 *         "href": {
 *           mode: "simple",
 *           value: /^https?:\/\//,
 *           required: true
 *         }
 *       }
 *     }
 *   },
 *   topLevelLimits: {
 *     children: 100,
 *     nesting: 10
 *   }
 * };
 *
 * const html = '<div class="container"><a href="javascript:alert(1)">Click me</a></div>';
 * const conformed = enforceHtml(html, options);
 * console.log(conformed); // '<div class="container"></div>'
 * ```
 *
 * @example
 * ```typescript
 * // Basic usage with minimal configuration
 * const basicOptions: SchemaOptions = {
 *   tags: {
 *     "p": {
 *       attributes: {
 *         "class": {
 *           mode: "simple",
 *           value: "*" // Allow any class value
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const html = '<p class="text-center">Hello World</p><script>alert("xss")</script>';
 * const conformed = enforceHtml(html, basicOptions);
 * console.log(conformed); // '<p class="text-center">Hello World</p>'
 * ```
 *
 * @throws {Error} May throw errors if error handling is configured to "throwError" mode
 * and validation failures occur during processing.
 */
export function enforceHtml(html: string, options: SchemaOptions): string {
  if (html === "") {
    return "";
  }

  environment ??= createNodeDomEnvironment();
  return enforceWithEnvironment(html, options, environment);
}
