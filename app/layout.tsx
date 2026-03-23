import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { OfflineSyncProvider } from '@/contexts/offline-sync-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MerchantHub - Business Management',
  description: 'Manage your clients, invoices, events, and tickets with MerchantHub',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MerchantHub',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <OfflineSyncProvider>
          {children}
        </OfflineSyncProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
