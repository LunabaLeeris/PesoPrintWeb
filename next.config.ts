import type { NextConfig } from "next";

const isHealthDisabled =
  process.env.DISABLE_HEALTH_CHECKS === 'true' ||
  process.env.NEXT_PUBLIC_DISABLE_HEALTH_CHECKS === 'true';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.100.18',
    '192.168.100.18:3000',
    '10.140.128.162',
    '10.140.128.162:3000',
    '10.140.131.235',
    '10.140.131.235:3000',
    '100.83.205.76',
    '100.83.205.76:3000',
  ],
  env: {
    DISABLE_HEALTH_CHECKS: String(isHealthDisabled),
    NEXT_PUBLIC_DISABLE_HEALTH_CHECKS: String(isHealthDisabled),
  },
};

export default nextConfig;
