/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite imagens de qualquer domínio externo (avatares, imagens de posts)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Redireccionamentos: / → /main
  async redirects() {
    return [
      {
        source: '/',
        destination: '/main',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
