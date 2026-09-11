/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/sales",
        destination: "/pos",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

