import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3010,
        proxy: {
            "/__mockapi": {
                target: "http://localhost:".concat(process.env.MOCKAPI_PORT || 3000),
                changeOrigin: true,
            },
            "/api": {
                target: "http://localhost:".concat(process.env.MOCKAPI_PORT || 3000),
                changeOrigin: true,
            },
        },
    },
});
