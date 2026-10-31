import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yatra — My Pilgrimage Planner',
    short_name: 'Yatra',
    description: 'Personal solo Jyotirlinga pilgrimage travel manager with private cloud sync and offline access.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f7f3',
    theme_color: '#174b3e',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['travel', 'productivity', 'lifestyle'],
  };
}
