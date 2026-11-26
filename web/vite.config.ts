import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:4173",
    changeOrigin: false
  }
};

export default defineConfig({
  // ໃຊ້ path ແບບ relative ເພື່ອໃຫ້ໃຊ້ໄດ້ທັງ GitHub Pages (/Apartment/) ແລະ server.py ທ້ອງຖິ່ນ (/)
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
    proxy: apiProxy
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
