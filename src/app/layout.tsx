import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Roboto } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
// import axios from 'axios';

import getSettings from './actions/getSettings';
import { SettingsProvider } from '@/context/SettingsContexts';
import { TransactionsProvider } from '@/context/TranasctionsContext';
import Header from '@/components/Header';
import MobileAppBar from '@/components/MobileAppBar';
import { DEFAULT_SETTINGS } from '@/constants/constants';
import { getOrCreateUser } from '@/lib/userUtils';
import CssBaseline from '@mui/material/CssBaseline';
// import { BankRate, findRate } from '@/lib/currenciesRate.utils';

import './globals.css';

// export const CURRENCY_ISO_MAP = {
//   EUR: 978,
//   PLN: 985,
//   UAH: 980,
//   USD: 840,
//   MDL: 498,
// };

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
      {
        rel: 'icon',
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        rel: 'mask-icon',
        url: '/mask-icon.svg',
        color: '#5bbad5',
      },
    ],
    apple: [
      { url: '/apple-icon-57x57.png', sizes: '57x57' },
      { url: '/apple-icon-60x60.png', sizes: '60x60' },
      { url: '/apple-icon-72x72.png', sizes: '72x72' },
      { url: '/apple-icon-76x76.png', sizes: '76x76' },
      { url: '/apple-icon-114x114.png', sizes: '114x114' },
      { url: '/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/apple-icon-144x144.png', sizes: '144x144' },
      { url: '/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-icon-180x180.png', sizes: '180x180' },
    ],
    other: {
      rel: 'manifest',
      url: '/manifest.webmanifest',
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

  // const { data: rates } = await axios.get<BankRate[]>(
  //   'https://api.monobank.ua/bank/currency',
  // );

  // const eurToPlnRate = findRate(
  //   CURRENCY_ISO_MAP.EUR,
  //   CURRENCY_ISO_MAP.PLN,
  //   rates,
  // );
  // const uahToEurRate = findRate(
  //   CURRENCY_ISO_MAP.UAH,
  //   CURRENCY_ISO_MAP.EUR,
  //   rates,
  // );
  // console.log(`EUR to PLN rate: ${eurToPlnRate}`);
  // console.log(`UAH to EUR rate: ${uahToEurRate}`);

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
