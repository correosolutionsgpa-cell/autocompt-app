/**
 * Represents a ledger account in the Chart of Accounts.
 */
export interface Account {
  id: string;
  accountCode: string; // e.g., "1000"
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  description: string;
  isActive: boolean;
}

/**
 * Represents a balanced accounting transaction (General Journal Entry).
 */
export interface JournalEntry {
  id: string;
  date: Date | string;
  description: string;
  documentReference: string; // Secure link to invoices/receipts (e.g. DocumentEntry ID)
  createdAt: Date | string; // Creation timestamp
}

/**
 * Represents an individual debit or credit line within a journal entry.
 */
export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  type: 'Debit' | 'Credit';
  amount: number; // Must be absolute/positive
}
