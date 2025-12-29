import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
