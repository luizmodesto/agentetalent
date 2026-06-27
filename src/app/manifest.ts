import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dj Gestão Eventos - Creat App',
    short_name: 'Dj Eventos',
    description: 'Gestão inteligente de eventos e oradores',
    start_url: '/',
    display: 'standalone',
    background_color: '#38bdf8',
    theme_color: '#38bdf8',
    icons: [
      {
        src: 'https://i.imgur.com/7g8ZWrI.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://i.imgur.com/7g8ZWrI.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
