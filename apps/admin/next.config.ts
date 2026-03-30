import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chatbox/shared-types'],
};

export default nextConfig;
