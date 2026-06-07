

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // @anthropic-ai/sdk v0.102+ dùng node:fs / node:path — phải external khỏi webpack
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

export default nextConfig
