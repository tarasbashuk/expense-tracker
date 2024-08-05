'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { SelectChangeEvent } from '@mui/material';

import addUpdateTransaction from '@/app/actions/addUpdateTransaction';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TranactionCategory, TransactionFormData } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { useTransactions } from '@/context/TranasctionsContext';
import AddTransactionModalView from './AddTransactionModalView';

const AddTransactionModal: React.FC = () => {
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const {
    transactions,
    transactionId,
    setTransactions,
    setTransactionId,
    setIsTransactionModalOpen,
  } = useTransactions();

  let initialAmount;
  let initialText = '';
  let initialCategory = '';
  let initialDate = new Date();
  let initialCurrency = defaultCurrency;
  let initialAmountDefaultCurrency;
  let initialType: TransactionType = TransactionType.Expense;

  const selectedTransaction = transactions.find(
    (tr) => tr.id === transactionId,
  );

  if (selectedTransaction) {
    const {
      date,
      text,
      type,
      amount,
      amountDefaultCurrency,
      category,
      currency,
    } = selectedTransaction;

    initialText = text;
    initialType = type;
    initialAmount = amount;
    initialCurrency = currency;
    initialCategory = category;
    initialDate = new Date(date);
    initialAmountDefaultCurrency = amountDefaultCurrency;
  }

  const [text, setText] = useState<string | undefined>(initialText);
  const [amount, setAmount] = useState<number | undefined>(initialAmount);
  const [amountDefaultCurrency, setAmountDefaultCurrency] = useState<
    number | undefined
  >(initialAmountDefaultCurrency);

  const [date, setDate] = useState<Date>(initialDate);
  const [category, setCategory] = useState<TranactionCategory | string>(
    initialCategory,
  );
  const [transactionType, setTranasctionType] =
    useState<TransactionType>(initialType);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const isBaseAmmountShown = currency !== defaultCurrency;

  const handleClose = () => {
    setTransactionId(null);
    setIsTransactionModalOpen(false);
  };

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => {
    setTranasctionType(newType);
    setCategory('');
  };

  const handleDateChange = (value: Date | null) => {
    const newValue = value ? value : new Date();
    // TODO: check all cases, MB need to convert to string
    setDate(newValue);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setText(value);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setAmount(value);
  };

  const handleAmountDefaultCurrencyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number(event.target.value);
    setAmountDefaultCurrency(value);
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setCurrency(event.target.value as Currency);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as TranactionCategory);
  };

  const categories =
    transactionType === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;

  // This is a rework of legacy implementaions from Brad Traversy cource,
  // TODO: think about using react-hook-form
  const clientAction = async () => {
    const formData: TransactionFormData = {
      date,
      currency,
      category,
      text: text as string,
      type: transactionType,
      amount: amount as number,
      amountDefaultCurrency: amountDefaultCurrency as number,
    };
    const { data, error } = await addUpdateTransaction(
      formData,
      isBaseAmmountShown,
      selectedTransaction?.id,
    );

    if (error) {
      toast.error(error);
    } else if (data) {
      toast.success(
        selectedTransaction ? 'Changes were saved' : 'A transaction was added',
      );
      setTransactions((transactions) => {
        const existingIndex = transactions.findIndex((tr) => tr.id === data.id);

        let updatedTransactions;

        if (existingIndex !== -1) {
          // Update the existing transaction
          updatedTransactions = [
            ...transactions.slice(0, existingIndex),
            data,
            ...transactions.slice(existingIndex + 1),
          ];
        } else {
          // Add new transaction
          updatedTransactions = [data, ...transactions];
        }

        // Sort transactions by date in descending order
        updatedTransactions.sort(
          (trA, trB) =>
            new Date(trB.date).getTime() - new Date(trA.date).getTime(),
        );

        return updatedTransactions;
      });
      handleClose();
    }
  };

  return (
    <AddTransactionModalView
      text={text}
      date={date}
      amount={amount}
      category={category}
      currency={currency}
      transactionType={transactionType}
      isEditMode={!!selectedTransaction}
      isBaseAmmountShown={isBaseAmmountShown}
      amountDefaultCurrency={amountDefaultCurrency}
      onSubmit={clientAction}
      handleClose={handleClose}
      handleTypeChange={handleTypeChange}
      handleDateChange={handleDateChange}
      handleTextChange={handleTextChange}
      handleAmountChange={handleAmountChange}
      handleCurrencyChange={handleCurrencyChange}
      handleCategoryChange={handleCategoryChange}
      handleAmountDefaultCurrencyChange={handleAmountDefaultCurrencyChange}
    />
  );
};

export default AddTransactionModal;
