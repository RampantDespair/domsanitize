import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { afterAll } from "vitest";

import { createEnforcer } from "../src/core";
import { testDomPurifyInterop } from "./support/dompurify";

const { window } = new JSDOM("");
afterAll(() => {
  window.close();
});

testDomPurifyInterop(createEnforcer(window), createDOMPurify(window));
