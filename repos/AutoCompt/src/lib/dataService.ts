import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Company, DocumentEntry, Category } from '../types';

const COMPANIES_COL = 'companies';
const EXPENSES_COL = 'expenses';

export const dataService = {
  // --- Companies ---
  async getCompanies(userId: string): Promise<Company[]> {
    try {
      const q = query(collection(db, COMPANIES_COL), where("ownerId", "==", userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Company));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, COMPANIES_COL);
      return [];
    }
  },

  async createCompany(userId: string, name: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COMPANIES_COL), {
        name,
        ownerId: userId,
        official_language: 'fr',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, COMPANIES_COL);
      return '';
    }
  },

  // --- Expenses ---
  subscribeToExpenses(userId: string, companyId: string, callback: (expenses: DocumentEntry[]) => void) {
    const q = query(
      collection(db, EXPENSES_COL), 
      where("ownerId", "==", userId),
      where("companyId", "==", companyId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentEntry));
      callback(expenses);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, EXPENSES_COL);
    });
  },

  async saveExpense(userId: string, companyId: string, expense: Omit<DocumentEntry, 'id' | 'ownerId' | 'companyId' | 'timestamp'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, EXPENSES_COL), {
        ...expense,
        ownerId: userId,
        companyId: companyId,
        createdAt: serverTimestamp(),
        // We also store subfields flattened if helpful for querying, but the type is nested
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, EXPENSES_COL);
      return '';
    }
  }
};
