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
  // ESLint-Konfiguration
  eslint: {
    // Warnung: Dies ignoriert ESLint-Fehler während des Builds.
    // Verwenden Sie dies nur vorübergehend und beheben Sie die Fehler später.
    ignoreDuringBuilds: true,
  },
  // Zusätzliche Konfigurationen können hier hinzugefügt werden
}

export default nextConfig;