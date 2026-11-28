import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* GitHub Pages ຕັ້ງ header ເອງບໍ່ໄດ້ — ຈຶ່ງໃສ່ CSP/ຄວາມປອດໄພຜ່ານ meta ຕອນ build
   (ບໍ່ໃສ່ໃນ dev ເພື່ອບໍ່ໃຫ້ HMR ແລະ React Refresh ຖືກບລັອກ) */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:"
].join("; ");

function securityMeta() {
  return {
    name: "security-meta",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      const tags = [
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        `<meta http-equiv="X-Content-Type-Options" content="nosniff" />`,
        `<meta name="referrer" content="no-referrer" />`,
        `<meta name="permissions-policy" content="camera=(), microphone=(), geolocation=(), payment=(), usb=()" />`
      ].join("\n    ");
      return html.replace("</head>", `    ${tags}\n  </head>`);
    }
  };
}

const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:4173",
    changeOrigin: false
  }
};

export default defineConfig({
  // ໃຊ້ path ແບບ relative ເພື່ອໃຫ້ໃຊ້ໄດ້ທັງ GitHub Pages (/Apartment/) ແລະ server.py ທ້ອງຖິ່ນ (/)
  base: "./",
  plugins: [react(), securityMeta()],
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
