import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite imágenes desde Firestore Storage y CDNs externos en el futuro
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'lafermata-fa9d5.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
