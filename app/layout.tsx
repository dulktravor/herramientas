import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Herramientas — utilidades rápidas y privadas',
  description:
    'Herramientas gratuitas para imágenes, PDF y datos que funcionan directamente en tu navegador.',
  openGraph: {
    title: 'Herramientas',
    description: 'Utilidades rápidas y privadas para tus archivos.',
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: '/og.png',
        width: 1733,
        height: 917,
        alt: 'Herramientas — utilidades rápidas y privadas para tus archivos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Herramientas',
    description: 'Utilidades rápidas y privadas para tus archivos.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({
              token: process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN,
            })}
          />
        ) : null}
      </body>
    </html>
  );
}
