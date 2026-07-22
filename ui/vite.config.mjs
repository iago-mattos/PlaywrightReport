import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    {
      name: "normalize-generated-whitespace",
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type === "chunk") {
            output.code = output.code.replace(/[\t ]+$/gmu, "");
          }
        }
      },
    },
  ],
  build: {
    emptyOutDir: true,
  },
});
