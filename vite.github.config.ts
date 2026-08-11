import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves projects from /account/repository/. Relative asset URLs
// let the same build work under any repository name without manual editing.
export default defineConfig({
  root: "github-pages",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-github",
    emptyOutDir: true,
  },
});
