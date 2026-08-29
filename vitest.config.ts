import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Test files share one real SQLite database; run them sequentially so
    // their beforeEach/afterEach cleanup doesn't race across files.
    fileParallelism: false,
  },
});
