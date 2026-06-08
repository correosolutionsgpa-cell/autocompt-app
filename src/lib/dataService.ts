import { Company, DocumentEntry } from '../types';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export const defaultWorkspaces = [
  {
    id: "1",
    nombre: "Solutions GPA Inc.",
    industry: "Gestionnaire de Bâtiments",
    legalEntity: "Incorporée",
    partners: ["Fabiola"],
    googleEmail: "solutionsgpa@gmail.com",
    driveConfig: { folderId: "gpa_management_vault", connected: true },
    accentColor: "purple",
    borderColor: "border-purple-500/25 dark:border-purple-500/35",
    focusRingColor: "ring-purple-500",
    textAccentColor: "text-purple-600 dark:text-purple-400",
    bgAccentColor: "bg-purple-50/50 dark:bg-purple-950/20",
    badgeBg:
      "bg-purple-100/80 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    gradientFromTo: "from-purple-500 to-indigo-600",
    partnerData: {
      Fabiola: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 150,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Tesla Model Y",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
    },
    userProfile: {
      logo: null,
      color: "#8B5CF6",
      font: "Moderne",
      nom: "Solutions GPA Inc.",
      adresse: "Laval, QC",
      tel: "450-555-0123",
      neq: "1170000000",
      tps: "123456789 RT0001",
      tvq: "1098765432 TQ0001",
      site: "www.propiosolutions.com",
      pago: "Virement: gestion@propiosolutions.com",
      tpsRate: 5,
      tvqRate: 9.975,
    },
  },
  {
    id: "2",
    nombre: "Achat Direct Inc.",
    industry: "Prospecteur & Flip",
    legalEntity: "Incorporée",
    partners: ["Fabiola", "Natalia"],
    googleEmail: "achatdirectqc@gmail.com",
    driveConfig: { folderId: "achat_direct_shared_vault", connected: true },
    accentColor: "emerald",
    borderColor: "border-emerald-500/25 dark:border-emerald-500/35",
    focusRingColor: "ring-emerald-500",
    textAccentColor: "text-[#059669] dark:text-emerald-400",
    bgAccentColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    badgeBg:
      "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    gradientFromTo: "from-emerald-500 to-teal-600",
    partnerData: {
      Fabiola: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 150,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Tesla Model Y",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
      Natalia: {
        homeOffice: {
          aireTotale: 1200,
          aireBureau: 200,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Audi Q5 Sportback",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
    },
    userProfile: {
      logo: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop",
      color: "#059669",
      font: "Moderne",
      nom: "Achat Direct Inc. (Natalia & Fabiola)",
      adresse: "Montréal, QC",
      tel: "514-555-9876",
      neq: "1179999999",
      tps: "987654321 RT0001",
      tvq: "1122334455 TQ0001",
      site: "www.achatdirect.ca",
      pago: "Virement: accounts@achatdirect.ca",
      tpsRate: 5,
      tvqRate: 9.975,
    },
  },
  {
    id: "3",
    nombre: "Triplex - Immobilier",
    industry: "Propriétaire de Plex",
    legalEntity: "Co-propriété (Individus)",
    partners: ["Fabiola", "Eric"],
    googleEmail: "solutionsgpa@gmail.com",
    driveConfig: { folderId: "plex_personal_drive", connected: true },
    accentColor: "orange",
    borderColor: "border-orange-500/25 dark:border-orange-500/35",
    focusRingColor: "ring-orange-500",
    textAccentColor: "text-orange-600 dark:text-orange-400",
    bgAccentColor: "bg-orange-50/50 dark:bg-orange-950/20",
    badgeBg:
      "bg-orange-100/80 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    gradientFromTo: "from-orange-500 to-amber-600",
    deductionFactor: 0.666,
    propertyType: "Triplex",
    partnersPct: { Fabiola: 50, Eric: 50 },
    partnerData: {
      Fabiola: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 50,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Tesla Model Y",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
      Eric: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 50,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Camry Hybrid",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
    },
    userProfile: {
      logo: null,
      color: "#F59E0B",
      font: "Moderne",
      nom: "Triplex - Immobilier",
      adresse: "Montréal (Triplex)",
      tel: "514-555-0000",
      neq: "Personal-Account",
      tps: "Personal",
      tvq: "Personal",
      site: "",
      pago: "Paiement Hypothécaire: Compte Conjoint",
      tpsRate: 5,
      tvqRate: 9.975,
    },
  },
  {
    id: "4",
    nombre: "Gonzalo Real Estate",
    industry: "Courtier Immobilier",
    legalEntity: "Travailleur Autonome",
    partners: ["Gonzalo", "Fabiola"],
    driveConfig: { folderId: "brokerage_courtier_vault", connected: true },
    partnerData: {
      Gonzalo: {
        homeOffice: {
          aireTotale: 1500,
          aireBureau: 300,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Lexus RX",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
      Fabiola: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 150,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "Tesla Model Y",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
    },
    userProfile: {
      logo: null,
      color: "#059669",
      font: "Moderne",
      nom: "Gonzalo Real Estate",
      adresse: "Brossard, QC",
      tel: "450-555-1122",
      neq: "2230000000",
      tps: "888777666 RT0001",
      tvq: "4445556667 TQ0001",
      site: "www.gonzalorealestate.ca",
      pago: "Virement: info@gonzalorealestate.ca",
      tpsRate: 5,
      tvqRate: 9.975,
    },
  },
  {
    id: "5",
    nombre: "Entrepreneur Général",
    industry: "Construction & Rénovations",
    legalEntity: "Incorporée",
    partners: ["Fabiola"],
    driveConfig: {
      folderId: "entrepreneur_construction_vault",
      connected: true,
    },
    partnerData: {
      Fabiola: {
        homeOffice: {
          aireTotale: 1000,
          aireBureau: 100,
          hydro: 0,
          assurance: 0,
          internet: 0,
          taxesMuni: 0,
          active: true,
        },
        vehicle: {
          model: "F-150 Lightning",
          kmInitial: 0,
          kmFinal: 0,
          mileageLogs: [],
        },
        paradas: [""],
      },
    },
    userProfile: {
      logo: null,
      color: "#059669",
      font: "Moderne",
      nom: "Entrepreneur Général Inc.",
      adresse: "Terrebonne, QC",
      tel: "450-555-3344",
      neq: "3340000000",
      tps: "555444333 RT0001",
      tvq: "6667778889 TQ0001",
      site: "www.fabiolaconstruction.ca",
      pago: "Virement: construction@fabiola.ca",
      tpsRate: 5,
      tvqRate: 9.975,
    },
  },
];

export const defaultHistorique = [
  {
    id: "FAC-001",
    companyId: "1",
    cliente: "Jean Tremblay",
    fecha: "2026-05-10",
    subtotal: 1000,
    tps: 50,
    tvq: 99.75,
    total: 1149.75,
    status: "Payée",
  },
  {
    id: "FAC-002",
    companyId: "1",
    cliente: "Marie Cote",
    fecha: "2026-05-12",
    subtotal: 500,
    tps: 25,
    tvq: 49.88,
    total: 574.88,
    status: "En attente",
  },
  {
    id: "FAC-003",
    companyId: "2",
    cliente: "Investisseur Global",
    fecha: "2026-05-14",
    subtotal: 2000,
    tps: 100,
    tvq: 199.5,
    total: 2299.5,
    status: "Payée",
  },
  {
    id: "PLEX-001",
    companyId: "3",
    cliente: "Locataire 1234",
    fecha: "2026-05-15",
    subtotal: 1200,
    tps: 0,
    tvq: 0,
    total: 1200.0,
    status: "Payée",
  },
];

export const defaultDepenses = [
  {
    id: 1,
    companyId: "1",
    fecha: "2026-05-01",
    fournisseur: "Bell",
    cat: "Télécommunications",
    subtotal: 80.0,
    tps: 4.0,
    tvq: 7.98,
    total: 91.98,
    lien: "#",
    partnerTag: "Fabiola",
  },
  {
    id: 2,
    companyId: "1",
    fecha: "2026-05-03",
    fournisseur: "Hydro-Québec",
    cat: "Bureau à domicile",
    subtotal: 150.0,
    tps: 7.5,
    tvq: 14.96,
    total: 172.46,
    lien: "#",
    partnerTag: "Fabiola",
  },
  {
    id: 3,
    companyId: "2",
    fecha: "2026-05-05",
    fournisseur: "Apple Store",
    cat: "Équipement",
    subtotal: 1200.0,
    tps: 60.0,
    tvq: 119.7,
    total: 1379.7,
    lien: "#",
    partnerTag: "Natalia",
  },
  {
    id: 4,
    companyId: "3",
    fecha: "2026-05-06",
    fournisseur: "Taxes Municipales",
    cat: "Bureau à domicile",
    subtotal: 2000.0,
    tps: 0,
    tvq: 0,
    total: 2000.0,
    lien: "#",
    partnerTag: "Fabiola",
  },
];

export const defaultPropertiesSeed = [
  {
    id: "prop_1",
    typeLocation: "Appartement/Maison",
    adresse: "123 Rue Principale, Appt 1 (RDC)",
    nombrePieces: "4 1/2",
    montant: "1200",
    locataire: "Jean Tremblay",
    nomBail: "Jean Tremblay",
    status: "Actif"
  },
  {
    id: "prop_2",
    typeLocation: "Conteneur Chambres",
    adresse: "123 Rue Principale, Appt 2 (Étage)",
    montant: "0", 
    status: "Actif",
    isContainer: true,
    chambres: [
      { id: 21, identifiantChambre: "Habitation 1", montant: "450", locataire: "Alice Roy", status: "Actif", vacanceMois: 0 },
      { id: 22, identifiantChambre: "Habitation 2", montant: "400", locataire: "Marc Coté", status: "Vacant", vacanceMois: 2 },
      { id: 23, identifiantChambre: "Habitation 3", montant: "425", locataire: "Julie Martin", status: "Actif", vacanceMois: 0 },
      { id: 24, identifiantChambre: "Habitation 4", montant: "450", locataire: "Luc Lavoie", status: "Actif", vacanceMois: 0 }
    ]
  }
];

export const defaultLoyersSeed = [
  { id: "loyer_1", uniteAdresse: "Appt 1 (RDC) - 123 Rue Principale", locataire: "Jean Tremblay", loyer: 1200, statut: "Payé" },
  { id: "loyer_2", uniteAdresse: "Appt 2 (Étage) - 123 Rue Principale", locataire: "Marie Dubois", loyer: 950, statut: "En retard" }
];

export const dataService = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // --- Real Firebase Operations ---

  async seedUserData(userId: string): Promise<void> {
    // Check if user has workspaces seeded
    const workspaces = await this.fetchWorkspaces(userId);
    if (workspaces.length > 0) return; // already seeded/has data

    // Seed companies
    for (const comp of defaultWorkspaces) {
      const docId = `${userId}_company_${comp.id}`;
      await setDoc(doc(db, "companies", docId), {
        ...comp,
        id: docId,
        ownerId: userId,
        createdAt: new Date().toISOString()
      });
    }

    // Seed expenses (depenses)
    for (const dep of defaultDepenses) {
      const expenseId = `exp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const docCompanyId = `${userId}_company_${dep.companyId}`;
      await setDoc(doc(db, "expenses", expenseId), {
        companyId: docCompanyId,
        fecha: dep.fecha,
        fournisseur: dep.fournisseur,
        cat: dep.cat,
        subtotal: dep.subtotal,
        tps: dep.tps,
        tvq: dep.tvq,
        total: dep.total,
        lien: dep.lien,
        partnerTag: dep.partnerTag,
        ownerId: userId,
        createdAt: new Date().toISOString()
      });
    }

    // Seed properties
    for (const prop of defaultPropertiesSeed) {
      const docId = `${userId}_prop_${prop.id}`;
      await setDoc(doc(db, "properties", docId), {
        ...prop,
        id: docId,
        ownerId: userId,
        createdAt: new Date().toISOString()
      });
    }

    // Seed loyers
    for (const loyer of defaultLoyersSeed) {
      const docId = `${userId}_loyer_${loyer.id}`;
      await setDoc(doc(db, "loyers", docId), {
        ...loyer,
        id: docId,
        ownerId: userId,
        createdAt: new Date().toISOString()
      });
    }
  },

  async fetchWorkspaces(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, "companies"), where("ownerId", "==", userId));
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const idParts = doc.id.split("_company_");
        const originalId = idParts.length > 1 ? idParts[1] : doc.id;
        results.push({ ...data, id: originalId });
      });
      return results;
    } catch (e) {
      console.error("fetchWorkspaces failed, returning local default:", e);
      return defaultWorkspaces;
    }
  },

  async fetchExpenses(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, "expenses"), where("ownerId", "==", userId));
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const idParts = data.companyId?.split("_company_");
        const originalCompanyId = idParts && idParts.length > 1 ? idParts[1] : data.companyId;
        results.push({ ...data, id: doc.id, companyId: originalCompanyId });
      });
      return results;
    } catch (e) {
      console.error("fetchExpenses failed, returning local default:", e);
      return defaultDepenses;
    }
  },

  async fetchProperties(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, "properties"), where("ownerId", "==", userId));
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const idParts = doc.id.split("_prop_");
        const originalId = idParts.length > 1 ? idParts[1] : doc.id;
        results.push({ ...data, id: originalId });
      });
      return results;
    } catch (e) {
      console.error("fetchProperties failed, returning local default:", e);
      return defaultPropertiesSeed;
    }
  },

  async fetchLoyers(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, "loyers"), where("ownerId", "==", userId));
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const idParts = doc.id.split("_loyer_");
        const originalId = idParts.length > 1 ? idParts[1] : doc.id;
        results.push({ ...data, id: originalId });
      });
      return results;
    } catch (e) {
      console.error("fetchLoyers failed, returning local default:", e);
      return defaultLoyersSeed;
    }
  },

  async saveExpense(userId: string, expenseData: any): Promise<any> {
    const originalCompanyId = expenseData.companyId;
    const docCompanyId = `${userId}_company_${originalCompanyId}`;
    const data = {
      ...expenseData,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: expenseData.createdAt || new Date().toISOString()
    };
    if (expenseData.id && String(expenseData.id).length > 6 && isNaN(Number(expenseData.id))) {
      const id = String(expenseData.id);
      delete data.id;
      await setDoc(doc(db, "expenses", id), data);
      return { id, ...data, companyId: originalCompanyId };
    } else {
      delete data.id;
      const docRef = await addDoc(collection(db, "expenses"), data);
      return { id: docRef.id, ...data, companyId: originalCompanyId };
    }
  },

  async deleteExpense(expenseId: string): Promise<boolean> {
    await deleteDoc(doc(db, "expenses", String(expenseId)));
    return true;
  },

  async saveProperty(userId: string, propertyData: any): Promise<any> {
    const originalId = propertyData.id || `prop_${Date.now()}`;
    const docId = `${userId}_prop_${originalId}`;
    const data = {
      ...propertyData,
      id: docId,
      ownerId: userId,
      createdAt: propertyData.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, "properties", docId), data);
    return { id: originalId, ...data };
  },

  async deleteProperty(propertyId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_prop_${propertyId}` : propertyId;
    await deleteDoc(doc(db, "properties", docId));
    return true;
  },

  async saveLoyer(userId: string, loyerData: any): Promise<any> {
    const originalId = loyerData.id || `loyer_${Date.now()}`;
    const docId = `${userId}_loyer_${originalId}`;
    const data = {
      ...loyerData,
      id: docId,
      ownerId: userId,
      createdAt: loyerData.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, "loyers", docId), data);
    return { id: originalId, ...data };
  },

  async deleteLoyer(loyerId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_loyer_${loyerId}` : loyerId;
    await deleteDoc(doc(db, "loyers", docId));
    return true;
  },

  async saveWorkspace(userId: string, workspaceData: any): Promise<any> {
    const originalId = workspaceData.id || `company_${Date.now()}`;
    const docId = `${userId}_company_${originalId}`;
    const data = {
      ...workspaceData,
      id: docId,
      ownerId: userId,
      createdAt: workspaceData.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, "companies", docId), data);
    return { id: originalId, ...data };
  },

  // --- Fallback Simulated Latency Operations ---
  async fetchInitialWorkspaces(): Promise<any[]> {
    await this.delay(300);
    return defaultWorkspaces;
  },

  async fetchInitialInvoices(): Promise<any[]> {
    await this.delay(300);
    return defaultHistorique;
  },

  async fetchInitialExpenses(): Promise<any[]> {
    await this.delay(300);
    return defaultDepenses;
  },

  async createInvoice(invoiceData: any): Promise<any> {
    await this.delay(500);
    return { id: `FAC-${Math.floor(Math.random() * 10000)}`, ...invoiceData };
  },

  async updateInvoice(id: string, invoiceData: any): Promise<any> {
    await this.delay(500);
    return { id, ...invoiceData };
  },

  async deleteInvoice(id: string): Promise<boolean> {
    await this.delay(400);
    return true;
  },

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    await this.delay(800); 
    console.log(`Email sent to ${to}`);
    return true;
  }
};
