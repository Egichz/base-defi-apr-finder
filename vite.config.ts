import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // важно для GitHub Pages под репо base-defi-apr-finder
  base: "/base-defi-apr-finder/",
});
