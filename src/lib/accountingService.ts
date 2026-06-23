import { JournalEntry, JournalLine } from '../types/accounting';

export function validateAndPrepareTransaction(entryData: any, linesData: any[]) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of linesData) {
    // Ensure amount is treated as a number
    const amount = Number(line.amount) || 0;
    
    if (line.type === 'Debit') {
      totalDebits += amount;
    } else if (line.type === 'Credit') {
      totalCredits += amount;
    }
  }

  // Strict mathematical validation
  if (totalDebits !== totalCredits) {
    throw new Error("Transaction rejected: Debits and Credits must be perfectly balanced.");
  }

  console.log("Success: Transaction is perfectly balanced.", { totalDebits, totalCredits });

  return {
    entry: entryData as JournalEntry,
    lines: linesData as JournalLine[]
  };
}
