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
      // {
      //   rel: 'icon',
      //   url: '/favicon.ico',
      //   sizes: 'any', // for any size
      // },
      {
        rel: 'mask-icon',
        url: '/mask-icon.svg',
        color: '#5bbad5', // The color you want for the icon
      },
    ],
    apple: '/apple-touch-icon.png', // Ensure this is 180x180
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
