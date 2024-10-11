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
  currnecies: Currencies;
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
  const [currnecies, setCurrencies] = useState<Currencies>(initialCurrencies);

  return (
    <CurrenciesContext.Provider
      value={{
        currnecies,
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
