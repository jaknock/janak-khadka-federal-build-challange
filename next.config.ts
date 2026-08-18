import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.82"],
  experimental: { serverActions: { bodySizeLimit: "10mb" }, useTypeScriptCli: false },
};

export default nextConfig;
