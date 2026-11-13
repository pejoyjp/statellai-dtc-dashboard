import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const privateIPv4 = Object.values(networkInterfaces()).flatMap((interfaces) =>
  (interfaces ?? []).filter(({ family, address, internal }) =>
    family === "IPv4" && !internal && /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(address),
  ).map(({ address }) => address),
);

const nextConfig: NextConfig = {
  // Next.js checks the hostname used in the browser, not the client device IP.
  allowedDevOrigins: [...new Set(["192.168.160.68", ...privateIPv4])],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
