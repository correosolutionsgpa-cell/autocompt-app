import { validateAndPrepareTransaction } from './src/lib/accountingService';

const entryData = {
  id: "test-entry-1",
  description: "Remplacement de vitres thermos pour le Syndicat",
  date: new Date().toISOString(),
  documentReference: "doc-123",
  createdAt: new Date().toISOString()
};

const linesData = [
  { id: "line-1", journalEntryId: "test-entry-1", accountId: "acc-expense", type: 'Debit', amount: 1000 },
  { id: "line-2", journalEntryId: "test-entry-1", accountId: "acc-bank", type: 'Credit', amount: 900 }
];

console.log("Starting Trial by Fire: Testing unbalanced transaction...");

try {
  validateAndPrepareTransaction(entryData, linesData);
  console.log("TEST FAILED: The system allowed an unbalanced transaction.");
} catch (error: any) {
  console.log(`TEST SUCCESS: System caught the imbalance! Error -> ${error.message}`);
}
