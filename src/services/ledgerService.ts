import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { validateAndPrepareTransaction } from '../lib/accountingService';

export async function postJournalEntry(entryData: any, linesData: any[]) {
  // 1. Strict mathematical validation
  const validated = validateAndPrepareTransaction(entryData, linesData);
  
  // 2. Initialize atomic batch
  const batch = writeBatch(db);

  // 3. Set the main entry document
  // Using entry.id if available, otherwise doc() will let Firestore auto-generate an ID if passed without path segments, 
  // but to guarantee ID usage when provided we use doc(collection, id) or doc(db, path, id).
  const entryRef = validated.entry.id 
    ? doc(db, 'journalEntries', validated.entry.id)
    : doc(collection(db, 'journalEntries'));
    
  batch.set(entryRef, validated.entry);

  // 4. Set each line in the journalLines collection
  for (const line of validated.lines) {
    const lineRef = line.id 
      ? doc(db, 'journalLines', line.id)
      : doc(collection(db, 'journalLines'));
      
    batch.set(lineRef, line);
  }

  // 5. Commit the batch atomically
  await batch.commit();

  return { 
    success: true, 
    message: "Transaction successfully validated and atomically committed to Firestore."
  };
}
