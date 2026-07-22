import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
