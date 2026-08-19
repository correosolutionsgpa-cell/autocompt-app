/**
 * fiscalDeadlines.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Calcule le compte à rebours réel d'une échéance fiscale saisie manuellement
 * par l'utilisateur — ne calcule JAMAIS une date à partir de règles fiscales
 * (année d'exercice, fréquence de déclaration ARC/Revenu Québec). Décision
 * explicite de Fabiola (18-08-2026) : elle préfère saisir chaque date
 * elle-même plutôt que risquer une date subtilement fausse que personne ne
 * remarquerait.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { FiscalDeadlineDoc } from './dataService';

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

const MONTHS_BY_RECURRENCE: Record<FiscalDeadlineDoc['recurrence'], number> = {
  aucune: 0,
  mensuelle: 1,
  trimestrielle: 3,
  annuelle: 12,
};

/**
 * Renvoie la prochaine occurrence réelle d'une échéance — n'écrit jamais
 * dans Firestore, c'est un calcul d'affichage uniquement. Pour une échéance
 * non récurrente déjà passée, renvoie la date telle quelle (affichée comme
 * en retard par l'appelant).
 */
export function getNextOccurrence(deadline: FiscalDeadlineDoc, today: Date = new Date()): Date {
  const due = parseISODate(deadline.dueDate);
  const stepMonths = MONTHS_BY_RECURRENCE[deadline.recurrence];
  if (stepMonths <= 0) return due;

  let next = due;
  // Avance par pas de récurrence jusqu'à trouver une date >= aujourd'hui
  // (ou jusqu'à 200 itérations, garde-fou contre une boucle infinie sur une
  // donnée corrompue).
  for (let i = 0; i < 200 && next < today; i++) {
    next = addMonths(next, stepMonths);
  }
  return next;
}

export interface UrgentDeadline {
  deadline: FiscalDeadlineDoc;
  nextOccurrence: Date;
  daysUntil: number; // négatif si en retard
  isOverdue: boolean;
}

/** Trouve l'échéance la plus urgente : en retard en premier, sinon la plus
 *  proche à venir. Renvoie null si la liste est vide. */
export function getMostUrgentDeadline(deadlines: FiscalDeadlineDoc[], today: Date = new Date()): UrgentDeadline | null {
  if (deadlines.length === 0) return null;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const computed = deadlines.map((deadline) => {
    const nextOccurrence = getNextOccurrence(deadline, startOfToday);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntil = Math.round((nextOccurrence.getTime() - startOfToday.getTime()) / msPerDay);
    return { deadline, nextOccurrence, daysUntil, isOverdue: daysUntil < 0 };
  });

  const overdue = computed.filter((c) => c.isOverdue).sort((a, b) => b.daysUntil - a.daysUntil);
  if (overdue.length > 0) return overdue[0];

  const upcoming = computed.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming[0];
}
