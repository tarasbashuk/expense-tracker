import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Roboto } from 'next/font/google';
import { ToastContainer } from 'react-toastify';

import getSettings from './actions/getSettings';
import { SettingsProvider } from '@/context/SettingsContexts';
import { TransactionsProvider } from '@/context/TranasctionsContext';
import Header from '@/components/Header';
import MobileAppBar from '@/components/MobileAppBar';
import { DEFAULT_SETTINGS } from '@/constants/constants';
import { getOrCreateUser } from '@/lib/userUtils';
import CssBaseline from '@mui/material/CssBaseline';

import './globals.css';

const roboto = Roboto({ weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses and create a budget',
  icons: {
    icon: [
      {
        rel: 'icon',
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        rel: 'icon',
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: '/apple-touch-icon.png',
    other: {
      rel: 'manifest',
      url: '/site.webmanifest',
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await getOrCreateUser();
  const { settings } = await getSettings();

  return (
    <ClerkProvider>
      <TransactionsProvider initialSettings={[]}>
        <SettingsProvider initialSettings={settings || DEFAULT_SETTINGS}>
          <html lang="en">
            <body className={roboto.className}>
              <CssBaseline />
              <Header />
              <main className="container">{children}</main>
              <MobileAppBar />
              <ToastContainer />
            </body>
          </html>
        </SettingsProvider>
      </TransactionsProvider>
    </ClerkProvider>
  );
}
