import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Roboto } from 'next/font/google';

import getSettings from './actions/getSettings';
import { SettingsProvider } from '@/context/SettingsContexts';
import Header from '@/components/Header';
import MobileAppBar from '@/components/MobileAppBar';

import './globals.css';

const roboto = Roboto({ weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses and create a budget',
};

const defaultSettings = {
  language: 'en',
  theme: 'light',
  transactions: [],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings } = await getSettings();

  return (
    <ClerkProvider>
      <SettingsProvider initialSettings={settings || defaultSettings}>
        <html lang="en">
          <body className={roboto.className}>
            <Header />
            <main className="container">{children}</main>
            <MobileAppBar />
          </body>
        </html>
      </SettingsProvider>
    </ClerkProvider>
  );
}
