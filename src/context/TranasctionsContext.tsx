'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { Transaction } from '@prisma/client';

interface TransactionsContextType {
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

export const TransactionsProvider = ({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: Transaction[];
}) => {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialSettings);

  return (
    <TransactionsContext.Provider value={{ transactions, setTransactions }}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);

  if (!context) {
    throw new Error(
      'useTransactions must be used within a TranasctionsProvider',
    );
  }

  return context;
};
