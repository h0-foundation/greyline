import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests cover the pure domain logic in lib/ (and any pure server/ helpers).
// Node environment — no jsdom — since these functions take plain data, not DOM.
// Aliases mirror tsconfig (@/* -> repo root, $server/* -> server/) but are scoped
// with regex so they never clobber real scoped packages like @radix-ui/*.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "server/**/*.test.ts"],
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: resolve(__dirname, "$1") },
      { find: /^\$server\/(.*)$/, replacement: resolve(__dirname, "server/$1") },
    ],
  },
});
