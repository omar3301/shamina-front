/** @type {import('next').NextConfig} */
const nextConfig = {
  // ضيف السطر ده هنا
  allowedDevOrigins: ['192.168.1.103'],
  
  // لو عندك إعدادات تانية زي الـ images سيبها زي ما هي تحت
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;