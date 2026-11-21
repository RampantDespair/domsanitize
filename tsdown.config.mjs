import { defineConfig } from "tsdown";

export default defineConfig({
  banner: { dts: "/// <reference lib=\"dom\" />" },
  clean: true,
  deps: {
    neverBundle: ["jsdom", "parse5", "parse5-htmlparser2-tree-adapter", "postcss"],
  },
  dts: true,
  entry: [
    "src/index.ts",
    "src/browser.ts",
    "src/core.ts",
    "src/defaults.ts",
    "src/lib/default/**/*.ts",
    "src/lib/utils/**/*.ts",
  ],
  format: ["esm", "cjs"],
  minify: true,
  sourcemap: true,
  target: "ESNext",
  treeshake: true,
});
