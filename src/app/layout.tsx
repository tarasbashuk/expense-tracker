import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Roboto } from 'next/font/google';
import { ToastContainer } from 'react-toastify';

import getSettings from './actions/getSettings';
import { SettingsProvider } from '@/context/SettingsContexts';
import Header from '@/components/Header';
import MobileAppBar from '@/components/MobileAppBar';
import { DEFAULT_SETTINGS } from '@/constants/constants';
import { getOrCreateUser } from '@/lib/userUtils';
import CssBaseline from '@mui/material/CssBaseline';

import './globals.css';
import 'react-toastify/dist/ReactToastify.css';

const roboto = Roboto({ weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses and create a budget',
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
    </ClerkProvider>
  );
}
