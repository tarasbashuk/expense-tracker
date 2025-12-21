'use client';
import { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import { toast } from 'react-toastify';
import { SelectChangeEvent } from '@mui/material';
import { isSameMonth, isSameYear } from 'date-fns';
import { useIntl } from 'react-intl';

import { addUpdateTransaction } from '@/app/actions/addUpdateTransaction';
import { Currency, TransactionType } from '@prisma/client';
import { TransactionCategory, TransactionFormData } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { useTransactions } from '@/context/TranasctionsContext';
import AddTransactionModalView from './AddTransactionModalView';
import { useCurrencies } from '@/context/CurrenciesContext';
import { CURRENCY_ISO_MAP } from '@/constants/constants';

const AddTransactionModal: React.FC = () => {
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const { currencies } = useCurrencies();
  const { formatMessage } = useIntl();

  const {
    transactions,
    transactionId,
    isCopyTransactionFlow,
    setTransactions,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
  } = useTransactions();

  const calculateAmountInDefaultCurrency = (
    value: number,
    currency: Currency,
  ) => {
    const rateKey = `${CURRENCY_ISO_MAP[currency]}-${CURRENCY_ISO_MAP[defaultCurrency as Currency]}`;
    const rate = currencies[rateKey];

    if (rate) {
      let amountInDefaultCurrency: number;

      if (currency === Currency.UAH || defaultCurrency === Currency.UAH) {
        // Divide when converting to/from UAH
        amountInDefaultCurrency = new Decimal(value)
          .div(rate)
          .toDecimalPlaces(2)
          .toNumber();
      } else {
        // Multiply for other cross-currency conversions
        amountInDefaultCurrency = new Decimal(value)
          .mul(rate)
          .toDecimalPlaces(2)
          .toNumber();
      }

      return amountInDefaultCurrency;
    }
  };

  let initialAmount;
  let initialText = '';
  let initialCategory = '';
  let initialDate = new Date();
  let initialAmountDefaultCurrency;
  let initialCurrency = defaultCurrency;
  let initialIsCreditTransaction = false;
  let initialIsRecurring = false;
  let initialRecurringEndDate: Date | undefined;
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
      category,
      currency,
      isCreditTransaction,
      isRecurring,
      recurringEndDate,
      amountDefaultCurrency,
    } = selectedTransaction;

    initialText = text;
    initialType = type;
    initialAmount = amount;
    initialCurrency = currency;
    initialCategory = category;
    initialDate = isCopyTransactionFlow ? new Date() : new Date(date);
    initialIsCreditTransaction = !!isCreditTransaction;
    initialIsRecurring = !!isRecurring;
    initialRecurringEndDate = isCopyTransactionFlow
      ? undefined
      : recurringEndDate
        ? new Date(recurringEndDate)
        : undefined;
    initialAmountDefaultCurrency = isCopyTransactionFlow
      ? calculateAmountInDefaultCurrency(amount, currency)
      : amountDefaultCurrency;
  }

  const [text, setText] = useState<string | undefined>(initialText);
  const [amount, setAmount] = useState<number | undefined>(initialAmount);
  const [amountDefaultCurrency, setAmountDefaultCurrency] = useState<
    number | undefined
  >(initialAmountDefaultCurrency);

  const [date, setDate] = useState<Date>(initialDate);
  const [category, setCategory] = useState<TransactionCategory | string>(
    initialCategory,
  );
  const [transactionType, setTranasctionType] =
    useState<TransactionType>(initialType);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [isCreditTransaction, setIsCreditTransaction] = useState(
    initialIsCreditTransaction,
  );
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(
    initialRecurringEndDate,
  );

  const [isSaving, setIsSaving] = useState(false);

  const isBaseAmountShown = currency !== defaultCurrency;

  const handleClose = () => {
    setTransactionId(null);
    setIsCopyTransactionFlow(false);
    setIsTransactionModalOpen(false);
  };

  const handleTypeChange = (newType: TransactionType) => {
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
    // to prevent passing 0 value if the event.target.value is an empty string
    const value = Number(event.target.value) || undefined;
    setAmount(value);

    if (isBaseAmountShown && value) {
      const amountInDefaultCurrency = calculateAmountInDefaultCurrency(
        value,
        currency,
      );

      setAmountDefaultCurrency(amountInDefaultCurrency);
    }
  };

  const handleAmountDefaultCurrencyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number(event.target.value) || undefined;
    setAmountDefaultCurrency(value);
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    const newCurrency = event.target.value as Currency;
    setCurrency(newCurrency);

    if (amount) {
      const amountInDefaultCurrency = calculateAmountInDefaultCurrency(
        amount,
        newCurrency,
      );

      setAmountDefaultCurrency(amountInDefaultCurrency);
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as TransactionCategory);
  };

  const handleIsCreditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCreditTransaction(event.target.checked);
  };

  const handleIsRecurringChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsRecurring(event.target.checked);
    if (!event.target.checked) {
      setRecurringEndDate(undefined);
    }
  };

  const handleRecurringEndDateChange = (value: Date | null) => {
    setRecurringEndDate(value || undefined);
  };

  // This is a rework of legacy implementaions from Brad Traversy cource,
  // TODO: think about using react-hook-form
  const clientAction = async () => {
    setIsSaving(true);
    const formData: TransactionFormData = {
      date,
      currency,
      category,
      isCreditTransaction,
      isRecurring,
      recurringEndDate,
      text: text as string,
      type: transactionType,
      amount: amount as number,
      amountDefaultCurrency: amountDefaultCurrency as number,
    };
    const transactionId = !isCopyTransactionFlow
      ? selectedTransaction?.id
      : undefined;

    const { data, error } = await addUpdateTransaction(
      formData,
      isBaseAmountShown,
      transactionId,
    );

    if (error) {
      toast.error(error);
    } else if (data) {
      toast.success(
        formatMessage({
          id: selectedTransaction
            ? 'addTransaction.saved'
            : 'addTransaction.added',
          defaultMessage: selectedTransaction
            ? 'Changes were saved'
            : 'A transaction was added',
        }),
      );

      const isTrFromTheCurrentMonth = isSameMonth(
        data.date,
        transactions[0]?.date,
      );
      const isTrFromTheCurrentYear = isSameYear(
        data.date,
        transactions[0]?.date,
      );

      // No need to update transactions if a new transaction belongs to a different than the current year/month
      if (isTrFromTheCurrentMonth && isTrFromTheCurrentYear) {
        setTransactions((transactions) => {
          const existingIndex = transactions.findIndex(
            (tr) => tr.id === data.id,
          );

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
      }
      handleClose();
    }
    setIsSaving(false);
  };

  useEffect(() => {
    document.body.classList.add('hide-scroll');

    return () => document.body.classList.remove('hide-scroll');
  }, []);

  return (
    <AddTransactionModalView
      text={text}
      date={date}
      amount={amount}
      category={category}
      currency={currency}
      isSubmitDisabled={isSaving}
      transactionType={transactionType}
      isEditMode={!!selectedTransaction}
      isBaseAmountShown={isBaseAmountShown}
      isCreditTransaction={isCreditTransaction}
      isRecurring={isRecurring}
      recurringEndDate={recurringEndDate}
      amountDefaultCurrency={amountDefaultCurrency}
      onSubmit={clientAction}
      handleClose={handleClose}
      handleTypeChange={handleTypeChange}
      handleDateChange={handleDateChange}
      handleTextChange={handleTextChange}
      handleAmountChange={handleAmountChange}
      handleCurrencyChange={handleCurrencyChange}
      handleCategoryChange={handleCategoryChange}
      handleIsCreditChange={handleIsCreditChange}
      handleIsRecurringChange={handleIsRecurringChange}
      handleRecurringEndDateChange={handleRecurringEndDateChange}
      handleAmountDefaultCurrencyChange={handleAmountDefaultCurrencyChange}
    />
  );
};

export default AddTransactionModal;
