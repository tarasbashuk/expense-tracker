'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { Currencies } from '@/constants/types';

interface CurrenciesContextType {
  currencies: Currencies;
  setCurrencies: Dispatch<SetStateAction<Currencies>>;
}

const CurrenciesContext = createContext<CurrenciesContextType | undefined>(
  undefined,
);

export const CurrenciesProvider = ({
  children,
  initialCurrencies,
}: {
  children: ReactNode;
  initialCurrencies: Currencies;
}) => {
  const [currencies, setCurrencies] = useState<Currencies>(initialCurrencies);

  return (
    <CurrenciesContext.Provider
      value={{
        currencies,
        setCurrencies,
      }}
    >
      {children}
    </CurrenciesContext.Provider>
  );
};

export const useCurrencies = () => {
  const context = useContext(CurrenciesContext);

  if (!context) {
    throw new Error('useCurrencies must be used within a CurrenciesProvider');
  }

  return context;
};
