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
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: Dispatch<SetStateAction<boolean>>;
  isCopyTransactionFlow: boolean;
  setIsCopyTransactionFlow: Dispatch<SetStateAction<boolean>>;
  transactionId: string | null;
  setTransactionId: Dispatch<SetStateAction<string | null>>;
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
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isCopyTransactionFlow, setIsCopyTransactionFlow] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        setTransactions,
        isTransactionModalOpen,
        setIsTransactionModalOpen,
        transactionId,
        setTransactionId,
        isCopyTransactionFlow,
        setIsCopyTransactionFlow,
      }}
    >
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
