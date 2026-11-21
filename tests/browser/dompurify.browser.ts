import createDOMPurify from "dompurify";

import { createEnforcer } from "../../src/core";
import { testDomPurifyInterop } from "../support/dompurify";

testDomPurifyInterop(createEnforcer(window), createDOMPurify(window));
