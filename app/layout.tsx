import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ConsentProvider } from '@/components/consent-provider';
import { siteDescription, siteName, siteTagline, siteUrl } from '@/lib/site';
import './globals.css';

const themeScript = `
  (() => {
    try {
      const savedTheme = window.localStorage.getItem('ceronube-theme');
      const useDarkTheme = savedTheme
        ? savedTheme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', useDarkTheme);
      document.documentElement.style.colorScheme = useDarkTheme ? 'dark' : 'light';
    } catch {}
  })();
`;

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
  applicationName: siteName,
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s | ${siteName}`,
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
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: '/og.png',
        width: 1733,
        height: 917,
        alt: 'CeroNube — Resuelve aquí. No subas nada.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConsentProvider>{children}</ConsentProvider>
      </body>
    </html>
  );
}
