/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages sirve la interfaz como sitio estático; la API sigue en NestJS.
  // En Docker conserva la salida standalone original.
  output: process.env.DEPLOY_STATIC === 'true' ? 'export' : 'standalone',
};

export default nextConfig;
