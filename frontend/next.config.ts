/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:9000/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      // LocalStack (local S3 emulator)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4566',
        pathname: '/**',
      },
      // AWS S3 (for production use)
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'personal-bucket-martinfiti.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/profile/**',
      },
    ],
  },
};

export default nextConfig;