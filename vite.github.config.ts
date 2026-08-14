import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "github",
  publicDir: path.resolve(process.cwd(), "public"),
  base: "./",
  build: {
    outDir: path.resolve(process.cwd(), "github-dist"),
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(process.cwd(), "github/index.html") },
  },
});
