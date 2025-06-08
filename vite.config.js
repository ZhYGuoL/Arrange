import { defineConfig } from "vite";

export default defineConfig({
  base: "/ARrange_App/",
  server: {
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
