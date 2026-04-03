import { createContext, use, ReactNode } from 'react';
import { usePendingTransactions } from '../hooks/usePendingTransactions';
import type { PendingTransaction } from '../components/TransactionPendingOverlay';

interface TransactionContextValue {
  transactions: PendingTransaction[];
  addTransaction: (tx: Omit<PendingTransaction, 'timestamp'>) => string;
  updateTransaction: (id: string, updates: Partial<PendingTransaction>) => void;
  dismissTransaction: (id: string) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const transactionState = usePendingTransactions();

  return <TransactionContext value={transactionState}>{children}</TransactionContext>;
}

export function useTransactionNotifications() {
  const context = use(TransactionContext);
  if (!context) {
    throw new Error('useTransactionNotifications must be used within TransactionProvider');
  }
  return context;
}
