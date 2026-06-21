'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { Currency, Transaction, TransactionType } from '@prisma/client';

export type TransactionDraft = {
  text: string;
  amount?: number;
  category: string;
  currency: Currency;
  type: TransactionType;
};

interface TransactionsContextType {
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: Dispatch<SetStateAction<boolean>>;
  isCopyTransactionFlow: boolean;
  setIsCopyTransactionFlow: Dispatch<SetStateAction<boolean>>;
  transactionId: string | null;
  setTransactionId: Dispatch<SetStateAction<string | null>>;
  transactionDraft: TransactionDraft | null;
  setTransactionDraft: Dispatch<SetStateAction<TransactionDraft | null>>;
  transactionsRefreshKey: number;
  requestTransactionsRefresh: () => void;
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
  const [transactionDraft, setTransactionDraft] =
    useState<TransactionDraft | null>(null);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        setTransactions,
        isTransactionModalOpen,
        setIsTransactionModalOpen,
        transactionId,
        setTransactionId,
        transactionDraft,
        setTransactionDraft,
        isCopyTransactionFlow,
        setIsCopyTransactionFlow,
        transactionsRefreshKey,
        requestTransactionsRefresh: () =>
          setTransactionsRefreshKey((current) => current + 1),
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
      'useTransactions must be used within a Transactions Provider',
    );
  }

  return context;
};
