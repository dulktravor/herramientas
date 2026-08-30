import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ConsentProvider } from '@/components/consent-provider';
import { siteDescription, siteUrl } from '@/lib/site';
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
  metadataBase: new URL(siteUrl),
  applicationName: 'Herramientas',
  title: {
    default: 'Herramientas — utilidades rápidas y privadas',
    template: '%s | Herramientas',
  },
  description: siteDescription,
  alternates: { canonical: '/' },
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
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
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    ? { other: { 'google-adsense-account': process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConsentProvider>{children}</ConsentProvider>
      </body>
    </html>
  );
}
