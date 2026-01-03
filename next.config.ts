import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Force restart timestamp: 2026-01-03
    output: "standalone",
    experimental: {
        serverActions: {
            allowedOrigins: ["dinner.dev.trustcode.me", "localhost:3000"],
        }
    },
    // Used to allow access from the dev tunnel

    allowedDevOrigins: ["dinner.dev.trustcode.me"],
};

export default nextConfig;
