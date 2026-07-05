/**
 * CompteFideicommis.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Module: Compte en Fidéicommis — Conformité OACIQ
 *
 * Implémente les exigences légales du gestionnaire immobilier au Québec :
 *   • Registre chronologique des dépôts (loyers reçus)
 *   • Registre chronologique des retraits (dépenses / honoraires / remises)
 *   • Conciliation mensuelle obligatoire
 *   • Relevé mensuel par propriétaire-client (PDF + email)
 *   • Reçu officiel auto-généré par dépôt (PDF + email locataire)
 *
 * Loi sur le courtage immobilier (RLRQ, c C-73.2) — Articles 95-97
 * OACIQ — Guide de gestion des comptes en fidéicommis 2024
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, Scale, Plus, X,
  CheckCircle2, AlertTriangle, ChevronDown, Download, Send,
  Loader2, Users, BarChart3, Menu, Trash2, RefreshCw, FileText,
  Building2, Mail, Phone, ExternalLink,
} from "lucide-react";
import {
  collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import type {
  FideicommisClientDoc,
  FideicommisDepotDoc,
  FideicommisRetraitDoc,
  FideicommisConciliationDoc,
} from "../../lib/dataService";

// ── Currency formatter ────────────────────────────────────────────────────────
const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = "tableau" | "depots" | "retraits" | "conciliation" | "releves" | "clients";

// ── Props ─────────────────────────────────────────────────────────────────────
export interface CompteFideicommisProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
  playNotificationSound?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const ym = (d: string) => d.slice(0, 7); // YYYY-MM

function generateReceiptNumber(depots: FideicommisDepotDoc[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace("-", "");
  const thisMonth = depots.filter(d => d.numeroRecu?.startsWith(ym));
  const seq = String(thisMonth.length + 1).padStart(4, "0");
  return `${ym}-${seq}`;
}

// ── PDF: Reçu de loyer ────────────────────────────────────────────────────────
function generateRecuPDF(depot: FideicommisDepotDoc, gestionnaireName: string): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const blue = [99, 102, 241] as [number, number, number];

  // Header band
  pdf.setFillColor(...blue);
  pdf.rect(0, 0, W, 38, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("REÇU DE LOYER OFFICIEL", 14, 16);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("Compte en fidéicommis · Conforme OACIQ", 14, 24);
  pdf.text(`Réf: ${depot.numeroRecu}`, 14, 31);

  // Body
  pdf.setTextColor(30, 30, 30);
  const row = (label: string, value: string, y: number) => {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(100, 100, 100);
    pdf.text(label.toUpperCase(), 14, y);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    pdf.text(value, 14, y + 6);
  };

  row("Date de réception", new Date(depot.date).toLocaleDateString("fr-CA", { dateStyle: "long" }), 50);
  row("Reçu de (Locataire)", depot.locataireName, 66);
  row("Pour la propriété", depot.propertyAddress, 82);
  row("Période couverte", `Du ${depot.periodeDebut} au ${depot.periodeFin}`, 98);
  row("Mode de paiement", depot.modePaiement.charAt(0).toUpperCase() + depot.modePaiement.slice(1), 114);
  row("Pour le compte de", depot.clientName, 130);
  row("Reçu par (Gestionnaire)", gestionnaireName, 146);

  // Amount box
  pdf.setFillColor(240, 243, 255);
  pdf.roundedRect(14, 162, W - 28, 26, 4, 4, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 180);
  pdf.text("MONTANT PERÇU", 22, 173);
  pdf.setFontSize(20);
  pdf.setTextColor(30, 30, 30);
  pdf.text(fmtCAD(depot.montant), 22, 183);

  // Fidéicommis confirmation
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(14, 196, W - 28, 14, 3, 3, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(22, 101, 52);
  pdf.text("✓  Cette somme a été déposée au compte en fidéicommis conformément à la Loi sur le courtage immobilier.", 20, 205);

  // Footer
  pdf.setFillColor(245, 245, 250);
  pdf.rect(0, 265, W, 32, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Ce reçu est généré automatiquement par AutoCompt · Gestionnaire Immobilier.", 14, 273);
  pdf.text("OACIQ — Loi sur le courtage immobilier (RLRQ, c C-73.2)", 14, 279);
  pdf.text(`Généré le ${new Date().toLocaleString("fr-CA")}`, 14, 285);

  return pdf;
}

// ── PDF: Relevé mensuel ───────────────────────────────────────────────────────
function generateRelevePDF(
  client: FideicommisClientDoc,
  depots: FideicommisDepotDoc[],
  retraits: FideicommisRetraitDoc[],
  period: string,
  gestionnaireName: string,
  companyName: string
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const indigo = [99, 102, 241] as [number, number, number];
  const [year, month] = period.split("-");
  const periodLabel = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  // Header
  pdf.setFillColor(...indigo);
  pdf.rect(0, 0, W, 42, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELEVÉ DE GESTION IMMOBILIÈRE", 14, 16);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Période : ${periodLabel.toUpperCase()}`, 14, 25);
  pdf.text(`Propriétaire : ${client.nom}`, 14, 32);
  pdf.text(`Gestionnaire : ${companyName || gestionnaireName}`, 14, 39);

  let y = 52;
  const section = (title: string) => {
    pdf.setFillColor(240, 242, 255);
    pdf.rect(14, y, W - 28, 7, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(70, 80, 180);
    pdf.text(title, 16, y + 5);
    y += 10;
  };
  const line = (label: string, amount: number, color?: [number, number, number]) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(40, 40, 40);
    pdf.text(label, 16, y);
    const val = fmtCAD(amount);
    pdf.setFont("helvetica", "bold");
    if (color) pdf.setTextColor(...color);
    pdf.text(val, W - 14, y, { align: "right" });
    pdf.setTextColor(40, 40, 40);
    pdf.setDrawColor(220, 220, 230);
    pdf.line(16, y + 2, W - 14, y + 2);
    y += 9;
  };
  const total = (label: string, amount: number, color: [number, number, number]) => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...color);
    pdf.text(label, 16, y);
    pdf.text(fmtCAD(amount), W - 14, y, { align: "right" });
    y += 12;
  };

  // Revenus
  const clientDepots = depots.filter(d => d.clientId === client.id && ym(d.date) === period);
  section("REVENUS — LOYERS PERÇUS");
  let totalLoyers = 0;
  if (clientDepots.length === 0) {
    pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text("Aucun dépôt enregistré pour cette période.", 16, y); y += 9;
  }
  clientDepots.forEach(d => {
    line(`Loyer — ${d.propertyAddress} (${d.locataireName})`, d.montant, [22, 101, 52]);
    totalLoyers += d.montant;
  });
  total("TOTAL REVENUS", totalLoyers, [22, 101, 52]);

  // Dépenses
  const clientDepenses = retraits.filter(r => r.clientId === client.id && r.type === "dépense" && ym(r.date) === period);
  section("DÉPENSES PAYÉES EN VOTRE NOM");
  let totalDepenses = 0;
  if (clientDepenses.length === 0) {
    pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text("Aucune dépense enregistrée pour cette période.", 16, y); y += 9;
  }
  clientDepenses.forEach(r => {
    line(`${r.description} — ${r.propertyAddress}`, r.montant, [180, 50, 50]);
    totalDepenses += r.montant;
  });
  total("TOTAL DÉPENSES", totalDepenses, [180, 50, 50]);

  // Honoraires
  const clientHonoraires = retraits.filter(r => r.clientId === client.id && r.type === "honoraires" && ym(r.date) === period);
  section("HONORAIRES DE GESTION");
  let totalHon = 0;
  clientHonoraires.forEach(r => {
    line(r.description, r.montant, [120, 80, 200]);
    totalHon += r.montant;
  });
  if (clientHonoraires.length === 0) {
    const autoHon = totalLoyers * (client.tauxHonoraires / 100);
    line(`Honoraires ${client.tauxHonoraires}% du loyer brut`, autoHon, [120, 80, 200]);
    totalHon = autoHon;
  }
  total("TOTAL HONORAIRES", totalHon, [120, 80, 200]);

  // Net remis
  const netRemis = totalLoyers - totalDepenses - totalHon;
  pdf.setFillColor(230, 255, 240);
  pdf.roundedRect(14, y, W - 28, 16, 3, 3, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(22, 101, 52);
  pdf.text("SOLDE NET REMIS AU PROPRIÉTAIRE", 20, y + 10);
  pdf.text(fmtCAD(Math.max(0, netRemis)), W - 14, y + 10, { align: "right" });
  y += 22;

  // Footer
  pdf.setFillColor(245, 245, 250);
  pdf.rect(0, 265, W, 32, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Relevé généré automatiquement par AutoCompt · Gestionnaire Immobilier.", 14, 273);
  pdf.text("OACIQ — Conformité Loi sur le courtage immobilier (RLRQ, c C-73.2)", 14, 279);
  pdf.text(`Généré le ${new Date().toLocaleString("fr-CA")} par ${gestionnaireName}`, 14, 285);

  return pdf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const CompteFideicommis: React.FC<CompteFideicommisProps> = ({
  darkMode,
  activeCompanyId,
  currentCompany,
  adminName,
  adminEmail,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
  playNotificationSound,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("tableau");

  // Data
  const [clients, setClients] = useState<FideicommisClientDoc[]>([]);
  const [depots, setDepots] = useState<FideicommisDepotDoc[]>([]);
  const [retraits, setRetraits] = useState<FideicommisRetraitDoc[]>([]);
  const [conciliations, setConciliations] = useState<FideicommisConciliationDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected period filter (YYYY-MM)
  const [selectedPeriod, setSelectedPeriod] = useState(() => today().slice(0, 7));

  // Form states
  const [showDepotForm, setShowDepotForm] = useState(false);
  const [showRetraitForm, setShowRetraitForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // Depot form
  const emptyDepot = () => ({
    date: today(), locataireName: "", propertyAddress: "",
    periodeDebut: selectedPeriod + "-01",
    periodeFin: selectedPeriod + "-30",
    montant: "", modePaiement: "virement" as const, clientId: "", notes: "",
  });
  const [depotForm, setDepotForm] = useState(emptyDepot());

  // Retrait form
  const emptyRetrait = () => ({
    date: today(), beneficiaire: "", propertyAddress: "",
    montant: "", type: "dépense" as const, description: "", clientId: "", notes: "",
  });
  const [retraitForm, setRetraitForm] = useState(emptyRetrait());

  // Client form
  const [clientForm, setClientForm] = useState({
    nom: "", email: "", telephone: "", tauxHonoraires: "8", proprietes: "",
  });

  // Conciliation form
  const [concilForm, setConcilForm] = useState({ soldeBancaire: "", notes: "" });

  // Relevé
  const [releveClientId, setReleveClientId] = useState("");
  const [releveEmail, setReleveEmail] = useState("");

  // ── Firestore load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [cSnap, dSnap, rSnap, conSnap] = await Promise.all([
        getDocs(query(collection(db, "fideicommisClients"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "fideicommisDepots"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid), orderBy("date", "desc"))),
        getDocs(query(collection(db, "fideicommisRetraits"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid), orderBy("date", "desc"))),
        getDocs(query(collection(db, "fideicommisConciliations"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid))),
      ]);
      setClients(cSnap.docs.map(d => d.data() as FideicommisClientDoc));
      setDepots(dSnap.docs.map(d => d.data() as FideicommisDepotDoc));
      setRetraits(rSnap.docs.map(d => d.data() as FideicommisRetraitDoc));
      setConciliations(conSnap.docs.map(d => d.data() as FideicommisConciliationDoc));
    } catch (e) { console.error("[Fidéicommis] load error:", e); }
    finally { setIsLoading(false); }
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  // ── Computed balances ──────────────────────────────────────────────────────
  const totalDepots = depots.reduce((s, d) => s + d.montant, 0);
  const totalRetraits = retraits.reduce((s, r) => s + r.montant, 0);
  const soldeTotal = totalDepots - totalRetraits;

  const periodDepots = depots.filter(d => ym(d.date) === selectedPeriod);
  const periodRetraits = retraits.filter(r => ym(r.date) === selectedPeriod);
  const periodDepotsSum = periodDepots.reduce((s, d) => s + d.montant, 0);
  const periodRetraitsSum = periodRetraits.reduce((s, r) => s + r.montant, 0);

  const concilThisMonth = conciliations.find(c => c.period === selectedPeriod);

  // Balance per client
  const balanceByClient = clients.map(c => {
    const cd = depots.filter(d => d.clientId === c.id).reduce((s, d) => s + d.montant, 0);
    const cr = retraits.filter(r => r.clientId === c.id).reduce((s, r) => s + r.montant, 0);
    return { ...c, balance: cd - cr };
  });

  // ── Save Dépôt ────────────────────────────────────────────────────────────
  const handleSaveDepot = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !depotForm.clientId || !depotForm.montant || !depotForm.locataireName) return;
    setIsSaving(true);
    try {
      const id = `${uid}_fiddepot_${Date.now()}`;
      const client = clients.find(c => c.id === depotForm.clientId);
      const numeroRecu = generateReceiptNumber(depots);
      const newDepot: FideicommisDepotDoc = {
        id, companyId: activeCompanyId, numeroRecu,
        date: depotForm.date, locataireName: depotForm.locataireName,
        propertyAddress: depotForm.propertyAddress,
        periodeDebut: depotForm.periodeDebut, periodeFin: depotForm.periodeFin,
        montant: parseFloat(depotForm.montant),
        modePaiement: depotForm.modePaiement,
        clientId: depotForm.clientId, clientName: client?.nom || "",
        notes: depotForm.notes, ownerId: uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "fideicommisDepots", id), newDepot);
      setDepots(prev => [newDepot, ...prev]);
      setShowDepotForm(false);
      setDepotForm(emptyDepot());
      playNotificationSound?.();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  // ── Save Retrait ──────────────────────────────────────────────────────────
  const handleSaveRetrait = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !retraitForm.clientId || !retraitForm.montant || !retraitForm.beneficiaire) return;
    setIsSaving(true);
    try {
      const id = `${uid}_fidretrait_${Date.now()}`;
      const client = clients.find(c => c.id === retraitForm.clientId);
      const newRetrait: FideicommisRetraitDoc = {
        id, companyId: activeCompanyId,
        date: retraitForm.date, beneficiaire: retraitForm.beneficiaire,
        propertyAddress: retraitForm.propertyAddress,
        montant: parseFloat(retraitForm.montant),
        type: retraitForm.type, description: retraitForm.description,
        clientId: retraitForm.clientId, clientName: client?.nom || "",
        notes: retraitForm.notes, ownerId: uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "fideicommisRetraits", id), newRetrait);
      setRetraits(prev => [newRetrait, ...prev]);
      setShowRetraitForm(false);
      setRetraitForm(emptyRetrait());
      playNotificationSound?.();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  // ── Save Client ───────────────────────────────────────────────────────────
  const handleSaveClient = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !clientForm.nom) return;
    setIsSaving(true);
    try {
      const id = `${uid}_fidclient_${Date.now()}`;
      const newClient: FideicommisClientDoc = {
        id, companyId: activeCompanyId, nom: clientForm.nom,
        email: clientForm.email, telephone: clientForm.telephone,
        proprietes: clientForm.proprietes.split("\n").map(s => s.trim()).filter(Boolean),
        tauxHonoraires: parseFloat(clientForm.tauxHonoraires) || 8,
        ownerId: uid, createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "fideicommisClients", id), newClient);
      setClients(prev => [...prev, newClient]);
      setShowClientForm(false);
      setClientForm({ nom: "", email: "", telephone: "", tauxHonoraires: "8", proprietes: "" });
      playNotificationSound?.();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  // ── Save Conciliation ─────────────────────────────────────────────────────
  const handleSaveConciliation = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !concilForm.soldeBancaire) return;
    setIsSaving(true);
    try {
      const soldeBancaire = parseFloat(concilForm.soldeBancaire);
      const prevMonth = selectedPeriod === today().slice(0, 7)
        ? conciliations.find(c => c.period < selectedPeriod)?.soldeBancaire ?? 0
        : 0;
      const soldeAttendu = prevMonth + periodDepotsSum - periodRetraitsSum;
      const ecart = soldeAttendu - soldeBancaire;
      const id = `${uid}_${activeCompanyId}_${selectedPeriod}`;
      const concil: FideicommisConciliationDoc = {
        id, companyId: activeCompanyId, period: selectedPeriod,
        totalDepots: periodDepotsSum, totalRetraits: periodRetraitsSum,
        soldeOuverture: prevMonth, soldeAttendu, soldeBancaire, ecart,
        statut: Math.abs(ecart) < 0.01 ? "équilibré" : "écart",
        notes: concilForm.notes, completedAt: new Date().toISOString(),
        ownerId: uid, createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "fideicommisConciliations", id), concil);
      setConciliations(prev => [concil, ...prev.filter(c => c.period !== selectedPeriod)]);
      setConcilForm({ soldeBancaire: "", notes: "" });
      playNotificationSound?.();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  // ── Download Reçu PDF ─────────────────────────────────────────────────────
  const downloadRecu = (depot: FideicommisDepotDoc) => {
    const pdf = generateRecuPDF(depot, adminName);
    pdf.save(`Recu-${depot.numeroRecu}.pdf`);
  };

  // ── Send Reçu by Email ────────────────────────────────────────────────────
  const sendRecuByEmail = async (depot: FideicommisDepotDoc, email: string) => {
    if (!email) return;
    setEmailSending(true);
    try {
      const pdf = generateRecuPDF(depot, adminName);
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
      await fetch("/api/send-recu-loyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          numeroRecu: depot.numeroRecu,
          locataireName: depot.locataireName,
          propertyAddress: depot.propertyAddress,
          montant: depot.montant,
          periode: `${depot.periodeDebut} au ${depot.periodeFin}`,
          gestionnaireName: adminName,
          companyName: currentCompany?.nombre,
          adminEmail,
          pdfBase64,
        }),
      });
    } catch (e) { console.error(e); }
    finally { setEmailSending(false); }
  };

  // ── Download Relevé PDF ────────────────────────────────────────────────────
  const downloadReleve = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const pdf = generateRelevePDF(client, depots, retraits, selectedPeriod, adminName, currentCompany?.nombre);
    pdf.save(`Releve-${client.nom.replace(/\s+/g, "-")}-${selectedPeriod}.pdf`);
  };

  // ── Send Relevé by Email ───────────────────────────────────────────────────
  const sendReleveByEmail = async () => {
    const client = clients.find(c => c.id === releveClientId);
    if (!client) return;
    const email = releveEmail || client.email;
    if (!email) return;
    setEmailSending(true);
    try {
      const pdf = generateRelevePDF(client, depots, retraits, selectedPeriod, adminName, currentCompany?.nombre);
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
      const [year, month] = selectedPeriod.split("-");
      const periodLabel = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
      await fetch("/api/send-releve-mensuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          clientName: client.nom,
          period: periodLabel,
          gestionnaireName: adminName,
          companyName: currentCompany?.nombre,
          adminEmail,
          pdfBase64,
        }),
      });
      playNotificationSound?.();
    } catch (e) { console.error(e); }
    finally { setEmailSending(false); }
  };

  // ── Delete handlers ────────────────────────────────────────────────────────
  const deleteDepot = async (id: string) => {
    if (!confirm("Supprimer ce dépôt ?")) return;
    await deleteDoc(doc(db, "fideicommisDepots", id));
    setDepots(prev => prev.filter(d => d.id !== id));
  };
  const deleteRetrait = async (id: string) => {
    if (!confirm("Supprimer ce retrait ?")) return;
    await deleteDoc(doc(db, "fideicommisRetraits", id));
    setRetraits(prev => prev.filter(r => r.id !== id));
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
    : "bg-white border-slate-200";

  const inputCls = `w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tableau", label: "Tableau de bord", icon: <BarChart3 size={14} /> },
    { id: "depots", label: "Dépôts", icon: <ArrowDownCircle size={14} /> },
    { id: "retraits", label: "Retraits", icon: <ArrowUpCircle size={14} /> },
    { id: "conciliation", label: "Conciliation", icon: <RefreshCw size={14} /> },
    { id: "releves", label: "Relevés", icon: <FileText size={14} /> },
    { id: "clients", label: "Clients", icon: <Users size={14} /> },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />

      {/* Header */}
      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40 shadow-sm`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista("dashboard")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <Scale size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none">
            Compte en Fidéicommis
          </h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            Conformité OACIQ · Loi sur le courtage immobilier
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${darkMode ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
            Solde: {fmtCAD(soldeTotal)}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className={`${glass} border-b overflow-x-auto`}>
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id
                  ? darkMode ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period selector (shown on most tabs) */}
      {activeTab !== "clients" && activeTab !== "tableau" && (
        <div className={`px-6 pt-4 flex items-center gap-3`}>
          <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Période</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
          />
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

              {/* ── TABLEAU DE BORD ─────────────────────────────────────── */}
              {activeTab === "tableau" && (
                <div className="space-y-4">
                  {/* Warning banner */}
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium leading-relaxed">
                      <strong>Rappel OACIQ :</strong> Toute somme reçue d&apos;un client doit être déposée <strong>immédiatement</strong> dans ce compte en fidéicommis, avant toute déduction d&apos;honoraires. La conciliation bancaire doit être effectuée chaque mois.
                    </p>
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Solde total", value: fmtCAD(soldeTotal), color: "indigo", icon: <Scale size={18} /> },
                      { label: "Total dépôts", value: fmtCAD(totalDepots), color: "emerald", icon: <ArrowDownCircle size={18} /> },
                      { label: "Total retraits", value: fmtCAD(totalRetraits), color: "rose", icon: <ArrowUpCircle size={18} /> },
                      { label: "Clients actifs", value: String(clients.length), color: "violet", icon: <Users size={18} /> },
                    ].map(kpi => (
                      <div key={kpi.label} className={`p-4 rounded-[24px] border ${glass}`}>
                        <div className={`text-${kpi.color}-500 mb-2`}>{kpi.icon}</div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{kpi.label}</p>
                        <p className={`text-lg font-black italic tracking-tighter text-${kpi.color}-500`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <button onClick={() => setActiveTab("depots")} className={`p-4 rounded-[24px] border flex flex-col items-start gap-2 text-left transition-all hover:border-emerald-400/50 ${glass}`}>
                      <ArrowDownCircle size={18} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nouveau dépôt</span>
                    </button>
                    <button onClick={() => setActiveTab("retraits")} className={`p-4 rounded-[24px] border flex flex-col items-start gap-2 text-left transition-all hover:border-rose-400/50 ${glass}`}>
                      <ArrowUpCircle size={18} className="text-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Nouveau retrait</span>
                    </button>
                    <button onClick={() => setVista("mandat_gestion")} className={`p-4 rounded-[24px] border flex flex-col items-start gap-2 text-left transition-all hover:border-indigo-400/50 ${glass}`}>
                      <FileText size={18} className="text-indigo-500" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block">Mandat de Gestion</span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${darkMode ? "text-indigo-400/60" : "text-indigo-500/60"}`}>OACIQ</span>
                      </div>
                    </button>
                  </div>

                  {/* Balance per client */}
                  <div className={`p-5 rounded-[28px] border ${glass}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Solde par propriétaire-client</h3>
                    {balanceByClient.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucun client enregistré. Ajoutez un client dans l&apos;onglet <strong>Clients</strong>.</p>
                    ) : (
                      <div className="space-y-2">
                        {balanceByClient.map(c => (
                          <div key={c.id} className={`flex items-center justify-between p-3 rounded-2xl border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-100 bg-slate-50"}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px] font-black">
                                {c.nom.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{c.nom}</p>
                                <p className={`text-[9px] font-medium ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{c.proprietes[0] || "—"}</p>
                              </div>
                            </div>
                            <span className={`font-black text-sm ${c.balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtCAD(c.balance)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent activity */}
                  <div className={`p-5 rounded-[28px] border ${glass}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Activité récente</h3>
                    <div className="space-y-2">
                      {[...depots.slice(0, 3).map(d => ({ ...d, kind: "depot" as const })),
                        ...retraits.slice(0, 3).map(r => ({ ...r, kind: "retrait" as const }))]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                            {item.kind === "depot"
                              ? <ArrowDownCircle size={14} className="text-emerald-500 shrink-0" />
                              : <ArrowUpCircle size={14} className="text-rose-500 shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold truncate">
                                {item.kind === "depot" ? (item as FideicommisDepotDoc).locataireName : (item as FideicommisRetraitDoc).beneficiaire}
                              </p>
                              <p className={`text-[9px] ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{item.date} · {item.clientName}</p>
                            </div>
                            <span className={`text-[11px] font-black ${item.kind === "depot" ? "text-emerald-500" : "text-rose-500"}`}>
                              {item.kind === "depot" ? "+" : "-"}{fmtCAD(item.montant)}
                            </span>
                          </div>
                        ))}
                      {depots.length === 0 && retraits.length === 0 && (
                        <p className={`text-sm ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucune activité enregistrée.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DÉPÔTS ──────────────────────────────────────────────── */}
              {activeTab === "depots" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                      {periodDepots.length} dépôt(s) · {fmtCAD(periodDepotsSum)}
                    </p>
                    <button onClick={() => setShowDepotForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20">
                      <Plus size={13} />Nouveau dépôt
                    </button>
                  </div>

                  {/* Depot Form */}
                  <AnimatePresence>
                    {showDepotForm && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className={`p-5 rounded-[28px] border space-y-4 ${glass}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-emerald-500">Enregistrer un dépôt</h3>
                            <button onClick={() => setShowDepotForm(false)}><X size={16} className={darkMode ? "text-zinc-500" : "text-slate-400"} /></button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Date</label>
                              <input type="date" value={depotForm.date} onChange={e => setDepotForm(p => ({ ...p, date: e.target.value }))} className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Propriétaire-client *</label>
                              <select value={depotForm.clientId} onChange={e => setDepotForm(p => ({ ...p, clientId: e.target.value }))} className={inputCls}>
                                <option value="">— Sélectionner —</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                              </select></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Locataire (payeur) *</label>
                              <input type="text" value={depotForm.locataireName} onChange={e => setDepotForm(p => ({ ...p, locataireName: e.target.value }))} placeholder="Nom du locataire" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Adresse de la propriété</label>
                              <input type="text" value={depotForm.propertyAddress} onChange={e => setDepotForm(p => ({ ...p, propertyAddress: e.target.value }))} placeholder="123 Rue Exemple, Montréal" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Période — début</label>
                              <input type="date" value={depotForm.periodeDebut} onChange={e => setDepotForm(p => ({ ...p, periodeDebut: e.target.value }))} className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Période — fin</label>
                              <input type="date" value={depotForm.periodeFin} onChange={e => setDepotForm(p => ({ ...p, periodeFin: e.target.value }))} className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Montant ($) *</label>
                              <input type="number" value={depotForm.montant} onChange={e => setDepotForm(p => ({ ...p, montant: e.target.value }))} placeholder="1200.00" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Mode de paiement</label>
                              <select value={depotForm.modePaiement} onChange={e => setDepotForm(p => ({ ...p, modePaiement: e.target.value as any }))} className={inputCls}>
                                <option value="virement">Virement bancaire</option>
                                <option value="chèque">Chèque</option>
                                <option value="espèce">Espèce</option>
                                <option value="carte">Carte de crédit/débit</option>
                                <option value="autre">Autre</option>
                              </select></div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button onClick={handleSaveDepot} disabled={isSaving || !depotForm.clientId || !depotForm.montant} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              Enregistrer · Générer le reçu
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Depot list */}
                  <div className="space-y-2">
                    {periodDepots.length === 0 ? (
                      <div className={`p-8 rounded-[28px] border text-center ${glass}`}>
                        <ArrowDownCircle size={28} className={`mx-auto mb-3 ${darkMode ? "text-zinc-700" : "text-slate-300"}`} />
                        <p className={`text-sm font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucun dépôt pour cette période.</p>
                      </div>
                    ) : periodDepots.map(d => (
                      <div key={d.id} className={`p-4 rounded-[24px] border flex items-start justify-between gap-3 ${glass}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                            <ArrowDownCircle size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">#{d.numeroRecu}</span>
                              <span className="text-sm font-bold">{d.locataireName}</span>
                            </div>
                            <p className={`text-[10px] font-medium mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{d.propertyAddress} · {d.date} · {d.modePaiement}</p>
                            <p className={`text-[9px] ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Client: {d.clientName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-black text-emerald-500">+{fmtCAD(d.montant)}</span>
                          <button onClick={() => downloadRecu(d)} title="Télécharger le reçu" className={`p-1.5 rounded-lg transition-colors ${darkMode ? "text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}><Download size={13} /></button>
                          <button onClick={() => deleteDepot(d.id)} title="Supprimer" className={`p-1.5 rounded-lg transition-colors ${darkMode ? "text-zinc-700 hover:text-rose-400" : "text-slate-300 hover:text-rose-500"}`}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── RETRAITS ────────────────────────────────────────────── */}
              {activeTab === "retraits" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                      {periodRetraits.length} retrait(s) · {fmtCAD(periodRetraitsSum)}
                    </p>
                    <button onClick={() => setShowRetraitForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-rose-500/20">
                      <Plus size={13} />Nouveau retrait
                    </button>
                  </div>

                  <AnimatePresence>
                    {showRetraitForm && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className={`p-5 rounded-[28px] border space-y-4 ${glass}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-rose-500">Enregistrer un retrait</h3>
                            <button onClick={() => setShowRetraitForm(false)}><X size={16} /></button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Date</label>
                              <input type="date" value={retraitForm.date} onChange={e => setRetraitForm(p => ({ ...p, date: e.target.value }))} className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Propriétaire-client *</label>
                              <select value={retraitForm.clientId} onChange={e => setRetraitForm(p => ({ ...p, clientId: e.target.value }))} className={inputCls}>
                                <option value="">— Sélectionner —</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                              </select></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Bénéficiaire *</label>
                              <input type="text" value={retraitForm.beneficiaire} onChange={e => setRetraitForm(p => ({ ...p, beneficiaire: e.target.value }))} placeholder="Nom du bénéficiaire" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Type de retrait</label>
                              <select value={retraitForm.type} onChange={e => setRetraitForm(p => ({ ...p, type: e.target.value as any }))} className={inputCls}>
                                <option value="dépense">Dépense payée au nom du client</option>
                                <option value="honoraires">Honoraires de gestion</option>
                                <option value="remise_nette">Remise nette au propriétaire</option>
                              </select></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Description</label>
                              <input type="text" value={retraitForm.description} onChange={e => setRetraitForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Plomberie, Honoraires juillet..." className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Adresse propriété</label>
                              <input type="text" value={retraitForm.propertyAddress} onChange={e => setRetraitForm(p => ({ ...p, propertyAddress: e.target.value }))} placeholder="123 Rue Exemple" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Montant ($) *</label>
                              <input type="number" value={retraitForm.montant} onChange={e => setRetraitForm(p => ({ ...p, montant: e.target.value }))} placeholder="500.00" className={inputCls} /></div>
                          </div>
                          <button onClick={handleSaveRetrait} disabled={isSaving || !retraitForm.clientId || !retraitForm.montant} className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            Enregistrer le retrait
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    {periodRetraits.length === 0 ? (
                      <div className={`p-8 rounded-[28px] border text-center ${glass}`}>
                        <ArrowUpCircle size={28} className={`mx-auto mb-3 ${darkMode ? "text-zinc-700" : "text-slate-300"}`} />
                        <p className={`text-sm font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucun retrait pour cette période.</p>
                      </div>
                    ) : periodRetraits.map(r => (
                      <div key={r.id} className={`p-4 rounded-[24px] border flex items-start justify-between gap-3 ${glass}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            r.type === "remise_nette" ? "bg-indigo-500/10 text-indigo-400" : r.type === "honoraires" ? "bg-violet-500/10 text-violet-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            <ArrowUpCircle size={16} />
                          </div>
                          <div>
                            <span className="text-sm font-bold">{r.beneficiaire}</span>
                            <p className={`text-[10px] font-medium mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{r.description} · {r.date}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              r.type === "remise_nette" ? "bg-indigo-500/10 text-indigo-400" : r.type === "honoraires" ? "bg-violet-500/10 text-violet-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {r.type === "remise_nette" ? "Remise nette" : r.type === "honoraires" ? "Honoraires" : "Dépense"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-black text-rose-500">-{fmtCAD(r.montant)}</span>
                          <button onClick={() => deleteRetrait(r.id)} className={`p-1.5 rounded-lg ${darkMode ? "text-zinc-700 hover:text-rose-400" : "text-slate-300 hover:text-rose-500"}`}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CONCILIATION ─────────────────────────────────────────── */}
              {activeTab === "conciliation" && (
                <div className="space-y-4">
                  <div className={`p-5 rounded-[28px] border space-y-4 ${glass}`}>
                    <h3 className="text-sm font-black uppercase italic tracking-tighter">
                      Conciliation mensuelle — {selectedPeriod}
                    </h3>
                    {concilThisMonth && (
                      <div className={`p-3 rounded-2xl border flex items-center gap-3 ${concilThisMonth.statut === "équilibré" ? (darkMode ? "bg-emerald-900/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200") : (darkMode ? "bg-amber-900/10 border-amber-500/30" : "bg-amber-50 border-amber-200")}`}>
                        {concilThisMonth.statut === "équilibré" ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                        <div>
                          <p className={`text-[10px] font-black uppercase ${concilThisMonth.statut === "équilibré" ? "text-emerald-600" : "text-amber-600"}`}>
                            {concilThisMonth.statut === "équilibré" ? "✓ Conciliation équilibrée" : "⚠️ Écart détecté"}
                          </p>
                          <p className="text-[9px] text-slate-500">Complétée le {new Date(concilThisMonth.completedAt || "").toLocaleDateString("fr-CA")}</p>
                        </div>
                        <span className={`ml-auto font-black text-sm ${concilThisMonth.statut === "équilibré" ? "text-emerald-500" : "text-amber-500"}`}>
                          Écart: {fmtCAD(concilThisMonth.ecart)}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { l: "Dépôts du mois", v: periodDepotsSum, c: "text-emerald-500" },
                        { l: "Retraits du mois", v: periodRetraitsSum, c: "text-rose-500" },
                        { l: "Solde attendu", v: periodDepotsSum - periodRetraitsSum, c: "text-indigo-500" },
                      ].map(row => (
                        <div key={row.l} className={`p-4 rounded-2xl border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-100 bg-slate-50"}`}>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{row.l}</p>
                          <p className={`text-base font-black italic ${row.c}`}>{fmtCAD(row.v)}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Solde bancaire réel (selon relevé)</label>
                      <input type="number" value={concilForm.soldeBancaire} onChange={e => setConcilForm(p => ({ ...p, soldeBancaire: e.target.value }))} placeholder="Entrez le solde de votre relevé bancaire..." className={inputCls} />
                    </div>
                    {concilForm.soldeBancaire && (
                      <div className={`p-4 rounded-2xl border-2 ${Math.abs((periodDepotsSum - periodRetraitsSum) - parseFloat(concilForm.soldeBancaire)) < 0.01 ? "border-emerald-400 bg-emerald-50/50" : "border-amber-400 bg-amber-50/50"}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${Math.abs((periodDepotsSum - periodRetraitsSum) - parseFloat(concilForm.soldeBancaire)) < 0.01 ? "text-emerald-700" : "text-amber-700"}`}>
                          Écart: {fmtCAD(Math.abs((periodDepotsSum - periodRetraitsSum) - parseFloat(concilForm.soldeBancaire)))}
                          {Math.abs((periodDepotsSum - periodRetraitsSum) - parseFloat(concilForm.soldeBancaire)) < 0.01 ? " — Équilibré ✓" : " — Vérification requise ⚠️"}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Notes (optionnel)</label>
                      <textarea rows={2} value={concilForm.notes} onChange={e => setConcilForm(p => ({ ...p, notes: e.target.value }))} placeholder="Explication des écarts, notes..." className={`${inputCls} resize-none`} />
                    </div>
                    <button onClick={handleSaveConciliation} disabled={isSaving || !concilForm.soldeBancaire} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20">
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Sauvegarder la conciliation
                    </button>
                  </div>

                  {/* History */}
                  {conciliations.length > 0 && (
                    <div className={`p-5 rounded-[28px] border ${glass}`}>
                      <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Historique des conciliations</h3>
                      <div className="space-y-2">
                        {conciliations.sort((a, b) => b.period.localeCompare(a.period)).map(c => (
                          <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                            <div className="flex items-center gap-2">
                              {c.statut === "équilibré" ? <CheckCircle2 size={13} className="text-emerald-500" /> : <AlertTriangle size={13} className="text-amber-500" />}
                              <span className="text-[11px] font-bold">{c.period}</span>
                            </div>
                            <span className={`text-[10px] font-black ${c.statut === "équilibré" ? "text-emerald-500" : "text-amber-500"}`}>
                              Écart: {fmtCAD(c.ecart)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── RELEVÉS ──────────────────────────────────────────────── */}
              {activeTab === "releves" && (
                <div className="space-y-4">
                  <div className={`p-5 rounded-[28px] border space-y-4 ${glass}`}>
                    <h3 className="text-sm font-black uppercase italic tracking-tighter">Relevé mensuel au propriétaire</h3>
                    <p className={`text-[11px] ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      Générez et envoyez un relevé mensuel détaillé à chaque propriétaire-client.
                    </p>
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Propriétaire-client</label>
                      <select value={releveClientId} onChange={e => { setReleveClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setReleveEmail(c?.email || ""); }} className={inputCls}>
                        <option value="">— Sélectionner un client —</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
                    {releveClientId && (
                      <>
                        {/* Preview */}
                        {(() => {
                          const c = clients.find(cl => cl.id === releveClientId)!;
                          const cDepots = depots.filter(d => d.clientId === releveClientId && ym(d.date) === selectedPeriod);
                          const cRetraits = retraits.filter(r => r.clientId === releveClientId && ym(r.date) === selectedPeriod);
                          const totalL = cDepots.reduce((s, d) => s + d.montant, 0);
                          const totalD = cRetraits.filter(r => r.type === "dépense").reduce((s, r) => s + r.montant, 0);
                          const totalH = cRetraits.filter(r => r.type === "honoraires").reduce((s, r) => s + r.montant, 0) || totalL * (c.tauxHonoraires / 100);
                          const net = totalL - totalD - totalH;
                          return (
                            <div className={`p-4 rounded-2xl border space-y-2 ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                              <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aperçu — {selectedPeriod}</p>
                              {[
                                { l: "Loyers perçus", v: totalL, c: "text-emerald-500" },
                                { l: "Dépenses payées", v: -totalD, c: "text-rose-500" },
                                { l: `Honoraires (${c.tauxHonoraires}%)`, v: -totalH, c: "text-violet-500" },
                              ].map(row => (
                                <div key={row.l} className="flex justify-between text-[11px]">
                                  <span className={darkMode ? "text-zinc-400" : "text-slate-600"}>{row.l}</span>
                                  <span className={`font-bold ${row.c}`}>{fmtCAD(row.v)}</span>
                                </div>
                              ))}
                              <div className={`flex justify-between font-black text-sm pt-2 border-t ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
                                <span>Net remis</span>
                                <span className="text-indigo-500">{fmtCAD(Math.max(0, net))}</span>
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Envoyer à (email)</label>
                          <input type="email" value={releveEmail} onChange={e => setReleveEmail(e.target.value)} placeholder="email@exemple.com" className={inputCls} />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => downloadReleve(releveClientId)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <Download size={13} />Télécharger PDF
                          </button>
                          <button onClick={sendReleveByEmail} disabled={!releveEmail || emailSending} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            {emailSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Envoyer par email
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── CLIENTS ──────────────────────────────────────────────── */}
              {activeTab === "clients" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{clients.length} propriétaire(s)-client(s)</p>
                    <button onClick={() => setShowClientForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20">
                      <Plus size={13} />Nouveau client
                    </button>
                  </div>

                  <AnimatePresence>
                    {showClientForm && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className={`p-5 rounded-[28px] border space-y-4 ${glass}`}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-indigo-500">Nouveau propriétaire-client</h3>
                            <button onClick={() => setShowClientForm(false)}><X size={16} /></button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Nom complet *</label>
                              <input type="text" value={clientForm.nom} onChange={e => setClientForm(p => ({ ...p, nom: e.target.value }))} placeholder="Jean Tremblay" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Courriel</label>
                              <input type="email" value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} placeholder="jean@exemple.com" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Téléphone</label>
                              <input type="tel" value={clientForm.telephone} onChange={e => setClientForm(p => ({ ...p, telephone: e.target.value }))} placeholder="514-555-0000" className={inputCls} /></div>
                            <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Taux d&apos;honoraires (%)</label>
                              <input type="number" value={clientForm.tauxHonoraires} onChange={e => setClientForm(p => ({ ...p, tauxHonoraires: e.target.value }))} placeholder="8" className={inputCls} /></div>
                          </div>
                          <div><label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Adresses des propriétés gérées (une par ligne)</label>
                            <textarea rows={3} value={clientForm.proprietes} onChange={e => setClientForm(p => ({ ...p, proprietes: e.target.value }))} placeholder={"123 Rue Principale, Montréal\n456 Ave Laval"} className={`${inputCls} resize-none`} /></div>
                          <button onClick={handleSaveClient} disabled={isSaving || !clientForm.nom} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            Enregistrer le client
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    {clients.length === 0 ? (
                      <div className={`p-10 rounded-[28px] border text-center ${glass}`}>
                        <Users size={32} className={`mx-auto mb-3 ${darkMode ? "text-zinc-700" : "text-slate-300"}`} />
                        <p className={`text-sm font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucun propriétaire-client enregistré.</p>
                        <p className={`text-[11px] mt-1 ${darkMode ? "text-zinc-700" : "text-slate-300"}`}>Ajoutez votre premier client pour commencer à enregistrer des dépôts.</p>
                      </div>
                    ) : clients.map(c => {
                      const bal = balanceByClient.find(b => b.id === c.id)?.balance ?? 0;
                      return (
                        <div key={c.id} className={`p-4 rounded-[24px] border ${glass}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-sm shrink-0">
                                {c.nom.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black">{c.nom}</p>
                                <div className={`flex flex-wrap gap-3 mt-1 text-[10px] font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                  {c.email && <span className="flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                                  {c.telephone && <span className="flex items-center gap-1"><Phone size={10} />{c.telephone}</span>}
                                  <span className="flex items-center gap-1"><Building2 size={10} />{c.proprietes.length} propriété(s)</span>
                                  <span>Honoraires: {c.tauxHonoraires}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-black ${bal >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtCAD(bal)}</p>
                              <p className={`text-[9px] ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Solde en fidéicommis</p>
                            </div>
                          </div>
                          {c.proprietes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pl-13">
                              {c.proprietes.map((p, i) => (
                                <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>{p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default CompteFideicommis;
