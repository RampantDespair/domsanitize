import type { SchemaOptions } from "../types/schema";
import type { DomEnvironment } from "./dom/environment";

import { handleTagChildrenError } from "./handlers/direct";
import { walkNode } from "./walker";

function enforceFragment(
  frag: DocumentFragment,
  options: SchemaOptions,
): boolean {
  if (
    options.topLevelLimits?.children !== undefined &&
    frag.childNodes.length > options.topLevelLimits.children
  ) {
    if (
      !handleTagChildrenError(
        frag,
        options.topLevelLimits.children,
        options.errorHandling?.tagChildren,
      )
    ) {
      return false;
    }
  }

  let child = frag.firstChild;
  while (child) {
    const next = child.nextSibling;
    walkNode(child, options, { rootNesting: 0, tagNesting: [] });
    child = next;
  }

  // Unwrapping during traversal can increase the number of root children.
  if (
    options.topLevelLimits?.children !== undefined &&
    frag.childNodes.length > options.topLevelLimits.children
  ) {
    if (
      !handleTagChildrenError(
        frag,
        options.topLevelLimits.children,
        options.errorHandling?.tagChildren,
      )
    ) {
      return false;
    }
  }

  return true;
}

/** Enforce and normalize an HTML fragment using the selected DOM environment. */
export function enforceWithEnvironment(
  html: string,
  options: SchemaOptions,
  environment: DomEnvironment,
): string {
  if (html === "") {
    return "";
  }

  let fragment = environment.parse(html);

  // Tree edits can create markup that the parser reparents or adds nodes to.
  // Validate that resulting tree before returning, with a bounded retry count
  // for schemas that continually recreate unstable markup (e.g. unwrapping tbody).
  for (let pass = 0; pass < 10; pass++) {
    if (!enforceFragment(fragment.root, options)) {
      return "";
    }

    const output = fragment.serialize();
    const reparsed = environment.parse(output);
    if (reparsed.serialize() === output) {
      return output;
    }

    fragment = reparsed;
  }

  throw new Error("HTML schema enforcement did not stabilize after 10 passes");
}
