/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    // Deaktiviere Source Maps in der Produktion
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
}

export default nextConfig;