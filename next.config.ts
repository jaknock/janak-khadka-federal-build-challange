import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" }, useTypeScriptCli: false },
};

export default nextConfig;
