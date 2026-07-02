import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Globe, FileSearch, Building, Hammer, Briefcase,
  Users, Volume2, VolumeX, Sun, Moon,
  ArrowRight, ArrowLeft, CheckCircle2,
  Building2, UserCheck, Home,
  Plus, Trash2, Info, AlertTriangle,
  Scan, Loader2, Camera, X,
} from "lucide-react";
import GlassRoleButton from "./GlassRoleButton";
import { SofiAvatarSVG } from "./SofiAvatarSVG";
import { SofiPresence } from "./SofiPresence";
import { useFiscal, BuildingLedger, CoOwner } from "../lib/FiscalContext";
import { auth } from "../lib/firebase";
import { dataService } from "../lib/dataService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingProfile =
  | "prospecteur"
  | "investisseur"
  | "flippeur"
  | "gestionnaire"
  | "syndicat";

export interface CoOwnerEntry {
  name: string;
  percentage: string; // kept as string for input binding; validated at submit
}

/** Editable review state shown after a rôle-foncier scan, before anything is saved. */
export interface TaxScanReview {
  adresse: string;
  doors: string[];
  superficieTotale: string;
  superficiePersonnelle: string;
  numeroLot: string;
  valeurTerrain: string;
  valeurBatiment: string;
  addressMismatch: boolean;
  mismatchAcknowledged: boolean;
}

export type OnboardingAnswers = Record<string, string | string[] | CoOwnerEntry[]>;

export interface OnboardingResult {
  profile: OnboardingProfile;
  lang: "FR" | "EN" | "ES";
  answers: OnboardingAnswers;
}

type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "text_input"
  | "number_input"
  | "co_owner_split"; // dynamic co-owner rows with % validation

interface QuestionOption {
  value: string;
  labelFR: string;
  labelEN: string;
  labelES: string;
  icon?: React.ReactNode;
}

interface OnboardingQuestion {
  id: string;
  type: QuestionType;
  universal?: boolean;
  titleFR: string;
  titleEN: string;
  titleES: string;
  subtitleFR?: string;
  subtitleEN?: string;
  subtitleES?: string;
  options?: QuestionOption[];
  placeholder?: { FR: string; EN: string; ES: string };
  /** Only show this question if a prior answer matches */
  showWhen?: { questionId: string; value: string };
  min?: number;
  max?: number;
  /** FR tooltip (deduction tip, etc.) */
  tooltipFR?: string;
}

// ─── Question Config ──────────────────────────────────────────────────────────

const QUESTIONS: Record<OnboardingProfile, OnboardingQuestion[]> = {

  // ── A. Prospecteur ────────────────────────────────────────────────────────
  prospecteur: [
    {
      id: "tps_tvq_registered",
      type: "single_choice",
      titleFR: "Êtes-vous inscrit aux fichiers de la TPS/TVQ ?",
      titleEN: "Are you registered for GST/QST taxes?",
      titleES: "¿Estás inscrito en los archivos fiscales de GST/QST?",
      subtitleFR: "Obligatoire si vos revenus mondiaux taxables dépassent 30 000\u00a0$ par trimestre civil ou sur 4 trimestres.",
      subtitleEN: "Mandatory if your taxable global income exceeds $30,000 per civil quarter or over 4 quarters.",
      subtitleES: "Obligatorio si tus ingresos imponibles superan los 30,000\u00a0$ por trimestre civil o en 4 trimestres.",
      options: [
        { value: "oui",      labelFR: "Oui, compte actif",      labelEN: "Yes, active account",      labelES: "S\u00ed, cuenta activa" },
        { value: "non",      labelFR: "Non",                    labelEN: "No",                        labelES: "No"                 },
        { value: "en_cours", labelFR: "En cours d'inscription", labelEN: "Registration in progress", labelES: "En proceso"          },
      ],
    },
    {
      id: "bureau_domicile",
      type: "single_choice",
      titleFR: "Avez-vous un bureau \u00e0 domicile ?",
      titleEN: "Do you have a home office space?",
      titleES: "¿Operas desde una oficina en casa?",
      subtitleFR: "Le module Bureau \u00e0 domicile calcule automatiquement votre d\u00e9duction fiscale selon l'espace utilis\u00e9.",
      subtitleEN: "The Home Office module automatically calculates your tax deduction based on space used.",
      subtitleES: "El m\u00f3dulo Oficina en Casa calcula autom\u00e1ticamente tu deducci\u00f3n fiscal seg\u00fan el espacio utilizado.",
      options: [
        { value: "oui_exclusif", labelFR: "Oui, espace exclusif", labelEN: "Yes, exclusive space", labelES: "S\u00ed, espacio exclusivo"   },
        { value: "oui_partage",  labelFR: "Oui, espace partag\u00e9",  labelEN: "Yes, shared space",    labelES: "S\u00ed, espacio compartido" },
        { value: "non",          labelFR: "Non",                  labelEN: "No",                   labelES: "No"                       },
      ],
    },
  ],

  // ── B. Investisseur — T776/TP-128, Relev\u00e9 31 ───────────────────────────────
  // Architectural rule: 1 building = 1 separate Tenue de Livres ledger.
  investisseur: [
    {
      id: "nb_immeubles",
      type: "number_input",
      titleFR: "Combien de BÂTIMENTS distincts gérez-vous dans votre portefeuille ?",
      titleEN: "How many distinct BUILDINGS do you manage in your portfolio?",
      titleES: "¿Cuántos EDIFICIOS distintos administras en tu cartera?",
      subtitleFR: "Entrez le nombre de bâtiments physiques. Peu importe le nombre de portes, chaque bâtiment a son propre grand livre. Les portes (unités) seront configurées à la prochaine étape.",
      subtitleEN: "Enter the number of physical buildings. Regardless of doors, each building has its own ledger. Units/doors will be configured in the next step.",
      subtitleES: "Ingresa el número de edificios físicos. Sin importar las puertas, cada edificio tiene su propio libro. Las unidades/puertas se configurarán en el siguiente paso.",
      min: 1, max: 99,
      placeholder: { FR: "Ex : 1", EN: "E.g. 1", ES: "Ej.: 1" },
    },
    {
      id: "mode_gestion_investisseur",
      type: "single_choice",
      titleFR: "Comment est g\u00e9r\u00e9e l'op\u00e9ration de vos immeubles ?",
      titleEN: "How is the operation of your properties managed?",
      titleES: "¿C\u00f3mo se gestiona la operaci\u00f3n de tus inmuebles?",
      subtitleFR: "D\u00e9termine si vous devez g\u00e9rer les baux op\u00e9rationnels ou uniquement votre fiscalit\u00e9 de financement.",
      subtitleEN: "Determines if you need to manage operational leases or only your financial taxation.",
      subtitleES: "Determina si necesitas gestionar contratos operativos o solo tu fiscalidad financiera.",
      options: [
        { value: "autogestion",      labelFR: "Autogestion compl\u00e8te (Baux & Locataires)",   labelEN: "Full self-management", labelES: "Autogesti\u00f3n completa" },
        { value: "gestion_deleguee", labelFR: "Gestion d\u00e9l\u00e9gu\u00e9e (Via gestionnaire externe)", labelEN: "Delegated management", labelES: "Gesti\u00f3n delegada"    },
      ],
    },
    {
      id: "emission_releve_31",
      type: "single_choice",
      titleFR: "Devez-vous produire des Relevés 31 pour vos locataires ?",
      titleEN: "Do you need to issue Relevé 31 forms for your tenants?",
      titleES: "¿Debes emitir formularios Relevé 31 para tus inquilinos?",
      subtitleFR: "Obligatoire pour tout logement (ou chambre) loué au 31 décembre au Québec.",
      subtitleEN: "Mandatory for any housing (or room) rented on Dec 31 in Quebec.",
      subtitleES: "Obligatorio para cualquier vivienda (o habitación) alquilada al 31 de diciembre en Quebec.",
      showWhen: { questionId: "mode_gestion_investisseur", value: "autogestion" },
      options: [
        { value: "oui", labelFR: "Oui, logements ou chambres louées au 31 déc.",                    labelEN: "Yes, units or rooms rented on Dec 31",                 labelES: "Sí, unidades o habitaciones alquiladas al 31 dic." },
        { value: "non", labelFR: "Non, commercial, Airbnb (court terme) ou 100 % vacant", labelEN: "No, commercial, Airbnb (short-term) or 100% vacant", labelES: "No, comercial, Airbnb (corto plazo) o 100% vacante"   },
      ],
    },
    {
      id: "besoins_autonomes_investisseur",
      type: "multi_choice",
      titleFR: "Que souhaitez-vous suivre de manière autonome dans AutoCompt ?",
      titleEN: "What do you want to track autonomously in AutoCompt?",
      titleES: "¿Qué deseas rastrear de manera autónoma en AutoCompt?",
      subtitleFR: "Permet de centraliser vos frais de financement privés sans interférer avec votre gestionnaire.",
      subtitleEN: "Allows centralizing your private financing fees without interfering with your manager.",
      subtitleES: "Permite centralizar tus gastos de financiamiento privados sin interferir con tu gestor.",
      showWhen: { questionId: "mode_gestion_investisseur", value: "gestion_deleguee" },
      options: [
        { value: "interets_financement",  labelFR: "Intérêts hypothécaires & Financement",            labelEN: "Mortgage interest & Financing",     labelES: "Intereses hipotecarios y Financiamiento" },
        { value: "depenses_personnelles", labelFR: "Dépenses mixtes (Automobile, Bureau à domicile)", labelEN: "Mixed expenses (Car, Home office)", labelES: "Gastos mixtos (Auto, Oficina en casa)"        },
        { value: "tableau_rendement",     labelFR: "Rapports fiscaux consolidés (T776/TP-128)",        labelEN: "Consolidated tax reports",           labelES: "Reportes fiscales consolidados (T776/TP-128)"          },
      ],
    },
    {
      id: "proprietaire_occupant",
      type: "single_choice",
      titleFR: "Êtes-vous propriétaire occupant au sein de l'un des bâtiments ?",
      titleEN: "Are you an owner-occupant within one of the buildings?",
      titleES: "¿Resides como propietario ocupante en alguno de los edificios?",
      subtitleFR: "Exigence fiscale : la proportion occupée personnellement doit être retranchée des dépenses déductibles.",
      subtitleEN: "Tax requirement: the proportion occupied for personal purposes must be subtracted from deductions.",
      subtitleES: "Requisito fiscal: la proporción ocupada para fines personales se restará de las deducciones.",
      options: [
        { value: "oui", labelFR: "Oui, j'y habite",    labelEN: "Yes, I live there", labelES: "Sí, vivo ahí"       },
        { value: "non", labelFR: "Non, 100 % locatif", labelEN: "No, 100% rented",   labelES: "No, 100% alquilado" },
      ],
    },
    {
      id: "calcul_portion_personnelle",
      type: "single_choice",
      titleFR: "Comment souhaitez-vous calculer votre portion personnelle ?",
      titleEN: "How would you like to calculate your personal portion?",
      titleES: "¿Cómo deseas calcular tu porción personal?",
      subtitleFR: "L'ARC recommande le calcul par superficie (pieds carrés) pour plus de précision. S.O.F.I. peut extraire ces dimensions automatiquement depuis votre acte notarié ou évaluation municipale.",
      subtitleEN: "The CRA recommends calculating by square footage for better accuracy. S.O.F.I. can extract these dimensions automatically from your deed or municipal assessment.",
      subtitleES: "La ARC recomienda el cálculo por pies cuadrados para mayor precisión. S.O.F.I. puede extraer estas dimensiones automáticamente desde tu escritura o evaluación municipal.",
      showWhen: { questionId: "proprietaire_occupant", value: "oui" },
      options: [
        { value: "superficie",  labelFR: "Par superficie (Pieds carrés / pi²)", labelEN: "By square footage (sq ft)",   labelES: "Por superficie (Pies cuadrados)"   },
        { value: "pourcentage", labelFR: "Je connais mon pourcentage exact",        labelEN: "I know my exact percentage", labelES: "Conozco mi porcentaje exacto"      },
      ],
    },
    {
      id: "superficie_totale",
      type: "number_input",
      titleFR: "Quelle est la superficie TOTALE du bâtiment (en pi²) ?",
      titleEN: "What is the TOTAL square footage of the building?",
      titleES: "¿Cuál es la superficie TOTAL del edificio (en pies cuadrados)?",
      subtitleFR: "Incluez toutes les unités — la vôtre ET celles des locataires.",
      subtitleEN: "Include all units — yours AND the tenants'.",
      subtitleES: "Incluye todas las unidades — la tuya Y las de los inquilinos.",
      showWhen: { questionId: "calcul_portion_personnelle", value: "superficie" },
      min: 100, max: 99999,
      placeholder: { FR: "Ex : 2500", EN: "E.g. 2500", ES: "Ej.: 2500" },
    },
    {
      id: "superficie_personnelle",
      type: "number_input",
      titleFR: "Quelle est la superficie de l'unité que VOUS occupez (en pi²) ?",
      titleEN: "What is the square footage of the unit YOU occupy?",
      titleES: "¿Cuál es la superficie de la unidad que TÚ ocupas?",
      subtitleFR: "AutoCompt calculera automatiquement votre % déductible : superficie personnelle ÷ superficie totale.",
      subtitleEN: "AutoCompt will automatically calculate your deductible %: personal area ÷ total area.",
      subtitleES: "AutoCompt calculará automáticamente tu % deducible: superficie personal ÷ superficie total.",
      showWhen: { questionId: "calcul_portion_personnelle", value: "superficie" },
      min: 100, max: 99999,
      placeholder: { FR: "Ex : 1000", EN: "E.g. 1000", ES: "Ej.: 1000" },
    },
    {
      id: "proportion_occupee_exacte",
      type: "number_input",
      titleFR: "Quel est le pourcentage exact que vous occupez ?",
      titleEN: "What exact percentage do you occupy?",
      titleES: "¿Qué porcentaje exacto ocupas?",
      subtitleFR: "Ex : 33 % pour un triplex dont vous habitez une unité sur trois.",
      subtitleEN: "E.g. 33% for a triplex where you occupy one unit of three.",
      subtitleES: "Ej.: 33% para un triplex donde ocupas una de tres unidades.",
      tooltipFR: "33 % occupé = 67 % des dépenses d'immeuble sont déductibles dans vos formulaires T776 / TP-128.",
      showWhen: { questionId: "calcul_portion_personnelle", value: "pourcentage" },
      min: 1, max: 99,
      placeholder: { FR: "Ex : 33", EN: "E.g. 33", ES: "Ej.: 33" },
    },
    {
      id: "nb_coproprietaires",
      type: "co_owner_split",
      titleFR: "Y a-t-il d'autres copropriétaires ou partenaires pour ces actifs ?",
      titleEN: "Are there other co-owners or partners for these assets?",
      titleES: "¿Hay otros copropietarios o socios para estos activos?",
      subtitleFR: "Structure la répartition automatique des gains/pertes nettes pour les déclarations d'impôts.",
      subtitleEN: "Structures automated split of net income/losses for tax declarations.",
      subtitleES: "Estructura el reparto automático de ingresos/pérdidas para las declaraciones.",
    },
  ],

  // ── C. Flippeur — Anti-Flip ARC, RBQ ──────────────────────────────────────
  flippeur: [
    {
      id: "structure_juridique",
      type: "single_choice",
      titleFR: "Quelle est la structure juridique de vos projets de flip ?",
      titleEN: "What is the legal structure of your flip projects?",
      titleES: "¿Cuál es la estructura jurídica de tus proyectos de flip?",
      subtitleFR: "Crucial pour valider si le gain est traité comme revenu d'entreprise (Inc.) ou personnel.",
      subtitleEN: "Crucial to determine if gains are business income (Inc.) or personal.",
      subtitleES: "Crucial para determinar si la ganancia es ingreso comercial (Inc.) o personal.",
      options: [
        { value: "inc",        labelFR: "Société par actions (Inc. / Incorporé)",   labelEN: "Incorporated Corporation (Inc.)",     labelES: "Sociedad por acciones (Inc.)"          },
        { value: "individuel", labelFR: "Entreprise individuelle / Nom personnel", labelEN: "Sole Proprietorship / Personal Name", labelES: "Empresa individual / Nombre personal" },
      ],
    },
    {
      id: "nb_coproprietaires",
      type: "co_owner_split",
      titleFR: "Y a-t-il d'autres partenaires ou investisseurs dans ce projet ?",
      titleEN: "Are there other partners or investors in this project?",
      titleES: "¿Hay otros socios o inversores en este proyecto?",
      subtitleFR: "Structure la répartition des revenus d'entreprise (Formulaire T2125 ou T2) entre les associés.",
      subtitleEN: "Structures the split of business income (Form T2125 or T2) among partners.",
      subtitleES: "Estructura el reparto de ingresos comerciales (Formulario T2125 o T2) entre los socios.",
    },
    {
      id: "duree_retention_prevue",
      type: "single_choice",
      titleFR: "Quelle est la dur\u00e9e de d\u00e9tention pr\u00e9vue avant la revente ?",
      titleEN: "What is the expected holding period before resale?",
      titleES: "¿Cu\u00e1l es el per\u00edodo de retenci\u00f3n previsto antes de la reventa?",
      subtitleFR: "Moins de 12 mois d\u00e9clenche automatiquement la r\u00e8gle Anti-Flip de l'ARC (100\u00a0% imp\u00f4t commercial).",
      subtitleEN: "Less than 12 months automatically triggers the CRA Anti-Flip rule (100% business tax).",
      subtitleES: "Menos de 12 meses activa autom\u00e1ticamente la regla Anti-Flip de la ARC (100% impuesto comercial).",
      options: [
        { value: "moins_12", labelFR: "Moins de 12 mois (Flip standard)",         labelEN: "Less than 12 months", labelES: "Menos de 12 meses" },
        { value: "plus_12",  labelFR: "12 mois et plus (R\u00e9novation \u00e0 long terme)", labelEN: "12 months and more",  labelES: "12 meses o m\u00e1s"    },
      ],
    },
    {
      id: "statut_licence_rbq",
      type: "single_choice",
      titleFR: "Quel est votre statut r\u00e9glementaire vis-\u00e0-vis de la RBQ ?",
      titleEN: "What is your regulatory status with the RBQ?",
      titleES: "¿Cu\u00e1l es tu estado regulatorio ante la RBQ?",
      subtitleFR: "Sans licence, la loi exige de confier 100\u00a0% des travaux \u00e0 des entrepreneurs licenci\u00e9s.",
      subtitleEN: "Without a license, law requires delegating 100% of work to licensed contractors.",
      subtitleES: "Sin licencia, la ley exige subcontratar el 100% de las obras a contratistas autorizados.",
      options: [
        { value: "licencie",       labelFR: "Titulaire d'une licence RBQ",            labelEN: "Licensed RBQ entrepreneur",      labelES: "Titular de una licencia RBQ"            },
        { value: "sous_traitance", labelFR: "Aucune licence (Sous-traitance compl\u00e8te)", labelEN: "No license (100% subcontracted)", labelES: "Sin licencia (Subcontrataci\u00f3n completa)" },
      ],
    },
    {
      id: "financement",
      type: "single_choice",
      titleFR: "Quel est votre v\u00e9hicule de financement principal ?",
      titleEN: "What is your primary financing vehicle?",
      titleES: "¿Cu\u00e1l es tu veh\u00edculo de financiamiento principal?",
      options: [
        { value: "prive",          labelFR: "Pr\u00eat priv\u00e9 / Capital propre",    labelEN: "Private loan / Equity", labelES: "Pr\u00e9stamo privado / Capital propio" },
        { value: "institutionnel", labelFR: "Hypoth\u00e8que bancaire / Marge HELOC", labelEN: "Bank mortgage / HELOC",   labelES: "Hipoteca bancaria / HELOC"          },
      ],
    },
  ],

  // ── D. Gestionnaire — T3 / Bare Trust ────────────────────────────────────────
  gestionnaire: [
    {
      id: "compte_fiducie",
      type: "single_choice",
      titleFR: "Utilisez-vous un compte en fiducie pour la gestion des loyers ?",
      titleEN: "Do you use a trust account for rent management?",
      titleES: "¿Utilizas una cuenta en fideicomiso para la gesti\u00f3n de rentas?",
      subtitleFR: "Active les modules de rapprochement et d'audits requis pour les rapports de Simple Fiducie (T3 / Annexe 15) \u00e0 l'ARC.",
      subtitleEN: "Activates specific flows required for Bare Trust reporting (T3 / Schedule 15) to the CRA.",
      subtitleES: "Activa los m\u00f3dulos requeridos para los reportes de Fideicomiso Simple (T3 / Anexo 15) ante la ARC.",
      options: [
        { value: "oui", labelFR: "Oui, compte fiducie actif",       labelEN: "Yes, active trust account",      labelES: "S\u00ed, cuenta de fideicomiso activa" },
        { value: "non", labelFR: "Non, perception directe standard", labelEN: "No, standard direct collection", labelES: "No, recaudaci\u00f3n directa est\u00e1ndar"  },
      ],
    },
    {
      id: "nb_clients",
      type: "single_choice",
      titleFR: "Quelle est la taille de votre portefeuille de clients investisseurs ?",
      titleEN: "What is the size of your investor client portfolio?",
      titleES: "¿Cu\u00e1l es el tama\u00f1o de tu cartera de clientes inversores?",
      options: [
        { value: "small",  labelFR: "1 \u00e0 5 clients",      labelEN: "1 to 5 clients",  labelES: "1 a 5 clientes"     },
        { value: "medium", labelFR: "6 \u00e0 20 clients",     labelEN: "6 to 20 clients", labelES: "6 a 20 clientes"    },
        { value: "large",  labelFR: "Plus de 20 clients", labelEN: "20+ clients",      labelES: "M\u00e1s de 20 clientes" },
      ],
    },
  ],

  // ── E. Syndicat — Loi 141, Loi 16 ──────────────────────────────────────────
  syndicat: [
    {
      id: "loi_141_statut",
      type: "single_choice",
      titleFR: "Avez-vous constitu\u00e9 le Fonds d'auto-assurance prescrit par la Loi 141 ?",
      titleEN: "Have you constituted the Self-insurance fund prescribed by Loi 141?",
      titleES: "¿Han constituido el Fondo de autoaseguro prescrito por la Loi 141?",
      subtitleFR: "Obligatoire pour couvrir l'int\u00e9gralit\u00e9 de la franchise la plus \u00e9lev\u00e9e de votre police d'assurance de copropri\u00e9t\u00e9.",
      subtitleEN: "Mandatory to fully cover the highest deductible of your syndicate insurance policy.",
      subtitleES: "Obligatorio para cubrir \u00edntegramente la franquicia m\u00e1s alta de su p\u00f3liza de seguro.",
      options: [
        { value: "constitue", labelFR: "Oui, capitalis\u00e9 selon la loi",  labelEN: "Yes, fully funded",  labelES: "S\u00ed, capitalizado por ley" },
        { value: "non",       labelFR: "Non, en cours ou non planifi\u00e9", labelEN: "No, not funded yet", labelES: "No, a\u00fan no planificado"   },
      ],
    },
    {
      id: "fonds_prevoyance_status",
      type: "single_choice",
      titleFR: "O\u00f9 en est votre \u00e9tude de fonds de pr\u00e9voyance (Loi 16) ?",
      titleEN: "What is the status of your contingency fund study (Bill 16)?",
      titleES: "¿Cu\u00e1l es el estado de su estudio de fondo de previsi\u00f3n (Ley 16)?",
      subtitleFR: "Obligatoire pour \u00e9tablir l\u00e9galement votre carnet d'entretien et indexer les charges de copropri\u00e9t\u00e9.",
      subtitleEN: "Mandatory to log structural maintenance and legally index condo fees.",
      subtitleES: "Obligatorio para planificar el libro de mantenimiento e indexar las cuotas de condominio legalmente.",
      options: [
        { value: "a_jour",    labelFR: "Compl\u00e9t\u00e9e et \u00e0 jour (Moins de 5 ans)", labelEN: "Completed & up to date", labelES: "Completado y al d\u00eda"          },
        { value: "non_faite", labelFR: "Non planifi\u00e9e / \u00c0 d\u00e9marrer",           labelEN: "Not started yet",        labelES: "No planificado / Por iniciar" },
      ],
    },
    {
      id: "nb_unites",
      type: "single_choice",
      titleFR: "Combien d'unit\u00e9s privatives compte l'ensemble de votre copropri\u00e9t\u00e9 ?",
      titleEN: "How many private units does your entire condominium contain?",
      titleES: "¿Cu\u00e1ntas unidades privadas abarca su copropiedad?",
      options: [
        { value: "small",  labelFR: "2 \u00e0 10 unit\u00e9s",    labelEN: "2 to 10 units",  labelES: "2 a 10 unidades"    },
        { value: "medium", labelFR: "11 \u00e0 50 unit\u00e9s",   labelEN: "11 to 50 units", labelES: "11 a 50 unidades"   },
        { value: "large",  labelFR: "Plus de 50 unit\u00e9s", labelEN: "50+ units",      labelES: "M\u00e1s de 50 unidades" },
      ],
    },
  ],
};

// ─── Profile color tokens ─────────────────────────────────────────────────────
const PROFILE_COLOR: Record<OnboardingProfile, { rgb: string }> = {
  prospecteur:  { rgb: "6,182,212"   },
  investisseur: { rgb: "16,185,129"  },
  flippeur:     { rgb: "245,158,11"  },
  gestionnaire: { rgb: "99,102,241"  },
  syndicat:     { rgb: "139,92,246"  },
};

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = "profile_select" | "questions" | "summary";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SofiOnboardingProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onComplete: (profile: string, lang: "FR" | "EN" | "ES", answers?: OnboardingAnswers) => void;
  playNotificationSound?: () => void;
}

// ─── Translations (shared UI strings) ────────────────────────────────────────
const T = {
  FR: {
    greeting: "Bonjour et bienvenue sur votre portail AutoCompt. Je suis S.O.F.I. L'ère de la gestion manuelle est révolue\u00a0: optimisons et automatisons dès aujourd'hui la comptabilité de vos biens immobiliers en toute simplicité.",
    subtitle: "Choisissez votre spécialité pour lancer l'automatisation intelligente.",
    profileHeading: "Quel est votre profil principal ?",
    next: "Continuer",
    back: "Retour",
    finish: "Lancer AutoCompt",
    stepLabel: (cur: number, tot: number) => `Étape ${cur} sur ${tot}`,
    selectAll: "Sélectionnez tout ce qui s'applique",
    profiles: {
      prospecteur:  { label: "Prospecteur Immobilier",  desc: "Outils DocuLégal intégrés pour simplifier votre travail sur le terrain." },
      investisseur: { label: "Investisseur Immobilier", desc: "Tenue de livres automatisée et distincte pour chacun de vos immeubles." },
      flippeur:     { label: "Flippeur Immobilier",     desc: "Centralisez votre comptabilité de chantier. Ne perdez plus aucune facture !" },
      gestionnaire: { label: "Gestionnaire Immobilier", desc: "Automatisez et organisez la comptabilité pour le portefeuille de chaque client." },
      syndicat:     { label: "Syndicat de Copropriété", desc: "Une administration transparente pour bâtir la confiance des copropriétaires." },
    },
  },
  EN: {
    greeting: "Hello! I am Sofi, your AutoCompt AI assistant expert in real estate taxation. I will guide you through your profile setup to fully automate your bookkeeping!",
    subtitle: "Choose your specialty to boot up smart automation.",
    profileHeading: "What is your main profile?",
    next: "Continue",
    back: "Back",
    finish: "Launch AutoCompt",
    stepLabel: (cur: number, tot: number) => `Step ${cur} of ${tot}`,
    selectAll: "Select all that apply",
    profiles: {
      prospecteur:  { label: "Property Finder",         desc: "Integrated DocuLégal tools to simplify your field work." },
      investisseur: { label: "Real Estate Investor",    desc: "Automated and separate bookkeeping for each of your properties." },
      flippeur:     { label: "Property Flipper",        desc: "Centralize your construction site accounting. Never lose a single invoice!" },
      gestionnaire: { label: "Property Manager",        desc: "Automate and organize accounting for each client's portfolio." },
      syndicat:     { label: "Condominium Association", desc: "Transparent administration to build co-owners' trust." },
    },
  },
  ES: {
    greeting: "¡Hola! Soy Sofi, tu asistente de IA de AutoCompt experta en fiscalidad inmobiliaria. ¡Te guiaré en la configuración de tu perfil para automatizar completamente tu contabilidad!",
    subtitle: "Elige tu especialidad para activar la automatización inteligente.",
    profileHeading: "¿Cuál es tu perfil principal?",
    next: "Continuar",
    back: "Atrás",
    finish: "Lanzar AutoCompt",
    stepLabel: (cur: number, tot: number) => `Paso ${cur} de ${tot}`,
    selectAll: "Selecciona todo lo que aplique",
    profiles: {
      prospecteur:  { label: "Buscador de Inmuebles",          desc: "Herramientas de DocuLégal integradas para simplificar tu trabajo de campo." },
      investisseur: { label: "Inversor Inmobiliario",          desc: "Contabilidad automatizada e independiente para cada uno de tus edificios." },
      flippeur:     { label: "Flippeur Inmobiliario",          desc: "Centraliza la contabilidad de tu obra. ¡No pierdas ninguna factura!" },
      gestionnaire: { label: "Gestor Inmobiliario",            desc: "Automatiza y organiza la contabilidad para la cartera de cada cliente." },
      syndicat:     { label: "Asociación de Copropietarios",   desc: "Una administración transparente para generar confianza en los copropietarios." },
    },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SofiOnboarding({
  darkMode, setDarkMode, onComplete, playNotificationSound,
}: SofiOnboardingProps) {
  const [lang, setLang]       = useState<"FR" | "EN" | "ES">("FR");
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // ── Step machine ──────────────────────────────────────────────────────────
  const [step, setStep]                         = useState<Step>("profile_select");
  const [selectedProfile, setSelectedProfile]   = useState<OnboardingProfile | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers]        = useState<OnboardingAnswers>({});
  const [multiPending, setMultiPending]         = useState<string[]>([]);

  // ── Investisseur special state ────────────────────────────────────────────
  const [coOwners, setCoOwners]             = useState<CoOwnerEntry[]>([{ name: "", percentage: "" }]);
  const [numberInputVal, setNumberInputVal] = useState<string>("");

  // ── S.O.F.I. AI Tax Dimension Scanner state ────────────────────────────────
  const [taxScanLoading, setTaxScanLoading] = useState(false);
  const [taxScanError, setTaxScanError]     = useState<string | null>(null);
  const [taxScanReview, setTaxScanReview]   = useState<TaxScanReview | null>(null);
  const taxScanFileRef = useRef<HTMLInputElement>(null);

  // ── Derived — filter questions by showWhen ────────────────────────────────
  const allQuestions = selectedProfile ? QUESTIONS[selectedProfile] : [];
  const questions = allQuestions.filter((q) => {
    if (!q.showWhen) return true;
    return onboardingAnswers[q.showWhen.questionId] === q.showWhen.value;
  });
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions  = questions.length;
  const progress        = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0;
  const t               = T[lang];

  // Co-owner validation
  const coOwnerTotal = coOwners.reduce((s, o) => s + (parseFloat(o.percentage) || 0), 0);
  const coOwnerValid = Math.abs(coOwnerTotal - 100) < 0.01 && coOwners.every((o) => o.name.trim() !== "");

  // ── Audio ─────────────────────────────────────────────────────────────────
  const playGreetingChime = React.useCallback(() => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(659.25, now + 0.1);
      osc1.frequency.setValueAtTime(783.99, now + 0.2);
      osc1.frequency.setValueAtTime(1046.50, now + 0.3);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.setValueAtTime(329.63, now + 0.1);
      osc2.frequency.setValueAtTime(392.00, now + 0.2);
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc1.connect(gainNode); osc2.connect(gainNode); gainNode.connect(ctx.destination);
      osc1.start(now); osc1.stop(now + 0.65);
      osc2.start(now); osc2.stop(now + 0.65);
      setAudioPlayed(true);
    } catch (e) {}
  }, [soundOn]);

  const playStepChime = React.useCallback(() => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.28);
    } catch (e) {}
  }, [soundOn]);

  useEffect(() => {
    playGreetingChime();
    const handle = () => { if (!audioPlayed) { playGreetingChime(); window.removeEventListener("click", handle); } };
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [playGreetingChime, audioPlayed]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleProfileSelect = (profile: OnboardingProfile) => {
    setSelectedProfile(profile);
    setCurrentQuestionIndex(0);
    setOnboardingAnswers({});
    setCoOwners([{ name: "", percentage: "" }]);
    setNumberInputVal("");
    const hasQs = QUESTIONS[profile].length > 0;
    if (hasQs) { setStep("questions"); } else { onComplete(profile, lang, {}); }
    playStepChime();
  };

  const handleSingleAnswer = (qId: string, value: string) => {
    const updated = { ...onboardingAnswers, [qId]: value };
    setOnboardingAnswers(updated);
    setTimeout(() => {
      // Recompute filtered questions with updated answers
      const allQs = selectedProfile ? QUESTIONS[selectedProfile] : [];
      const filteredQs = allQs.filter((q) => {
        if (!q.showWhen) return true;
        return updated[q.showWhen.questionId] === q.showWhen.value;
      });
      if (currentQuestionIndex < filteredQs.length - 1) {
        setCurrentQuestionIndex((i) => i + 1);
      } else {
        setStep("summary");
      }
      playStepChime();
    }, 280);
  };

  const handleMultiToggle = (value: string) => {
    setMultiPending((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const handleMultiConfirm = (qId: string) => {
    if (multiPending.length === 0) return;
    setOnboardingAnswers((prev) => ({ ...prev, [qId]: multiPending }));
    setMultiPending([]);
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setStep("summary");
    }
    playStepChime();
  };

  const handleBack = () => {
    if (step === "questions" && currentQuestionIndex === 0) {
      setStep("profile_select"); setSelectedProfile(null); setOnboardingAnswers({});
    } else if (step === "questions") {
      setCurrentQuestionIndex((i) => i - 1); setMultiPending([]);
    } else if (step === "summary") {
      setStep("questions"); setCurrentQuestionIndex(totalQuestions - 1);
    }
    playStepChime();
  };

  // ── S.O.F.I. AI Tax Dimension Scanner handler ─────────────────────────────
  // Never auto-saves: the extraction always lands in `taxScanReview` (editable),
  // and only the explicit "Confirmer" button in the review card persists it.
  const handleTaxDimensionScan = async (file: File) => {
    setTaxScanLoading(true);
    setTaxScanError(null);
    setTaxScanReview(null);
    try {
      // Convert the uploaded document to base64 for Gemini Vision
      const toBase64 = (f: File): Promise<string> =>
        new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(f);
        });
      const base64 = await toBase64(file);
      const mimeType = file.type || "application/pdf";

      // Route ALL Gemini calls through the backend proxy — never call Gemini directly
      // client-side. The VITE_GEMINI_API_KEY in .env.local is a short-lived OAuth token
      // (AQ.Ab... format), not a real API key, and causes 403 errors.
      // The server /api/scan-dimensions endpoint uses the GEMINI_API_KEY from .env.
      let parsed: any = null;

      // ── Primary: dedicated dimensions endpoint ──────────────────────────────
      try {
        const dimResp = await fetch("/api/scan-dimensions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Data: base64, mimeType, filename: file.name }),
        });
        if (dimResp.ok) {
          parsed = await dimResp.json();
          console.log("[S.O.F.I. Dimensions] Server extraction result:", parsed);
        } else {
          const err = await dimResp.text();
          throw new Error(`Server error ${dimResp.status}: ${err.slice(0, 200)}`);
        }
      } catch (proxyErr: any) {
        console.error("[S.O.F.I. Dimensions] /api/scan-dimensions failed:", proxyErr.message);
        throw new Error(
          lang === "FR" ? "Le serveur n'a pas pu analyser le document. Veuillez saisir les superficies manuellement." :
          lang === "EN" ? "The server could not analyze the document. Please enter the square footage manually." :
                          "El servidor no pudo analizar el documento. Por favor, ingrese las superficies manualmente."
        );
      }

      if (parsed.error) throw new Error(parsed.error);

      // Reconcile detected doors against the declared unit count — pad with
      // editable placeholders when the document names fewer doors than it counts.
      const nbUnites: number = Number(parsed.nombre_unites_total) || 0;
      const doors: string[] = Array.isArray(parsed.unites_identifiees) ? [...parsed.unites_identifiees] : [];
      while (doors.length < nbUnites) {
        doors.push(
          lang === "FR" ? `Porte ${doors.length + 1}` : lang === "EN" ? `Door ${doors.length + 1}` : `Puerta ${doors.length + 1}`
        );
      }

      const superficieTotalePi2: number = Number(parsed.superficie_totale_pi2) || 0;
      const doorCountForSplit = doors.length || nbUnites || 1;
      const superficiePersonnelleEstimee = superficieTotalePi2 > 0
        ? Math.round(superficieTotalePi2 / doorCountForSplit)
        : 0;

      const addressMismatch =
        onboardingAnswers["proprietaire_occupant"] === "oui" && parsed.est_proprietaire_occupant === false;

      setTaxScanReview({
        adresse: String(parsed.adresse_propriete || ""),
        doors,
        superficieTotale: superficieTotalePi2 > 0 ? String(superficieTotalePi2) : "",
        superficiePersonnelle: superficiePersonnelleEstimee > 0 ? String(superficiePersonnelleEstimee) : "",
        numeroLot: String(parsed.numero_lot || ""),
        valeurTerrain: parsed.valeur_terrain ? String(parsed.valeur_terrain) : "",
        valeurBatiment: parsed.valeur_batiment ? String(parsed.valeur_batiment) : "",
        addressMismatch,
        mismatchAcknowledged: false,
      });
      playStepChime();
      setTaxScanLoading(false);
    } catch (err: any) {
      console.error("Tax Dimension Scan Error:", err);
      setTaxScanError(
        lang === "FR" ? `Échec du scan : ${err.message}` :
        lang === "EN" ? `Scan failed: ${err.message}` :
                        `Escaneo fallido: ${err.message}`
      );
      setTaxScanLoading(false);
    }
  };

  // ── Confirms the reviewed scan data and advances the onboarding flow ──────
  const handleConfirmTaxScanReview = () => {
    if (!taxScanReview) return;
    const updated: OnboardingAnswers = {
      ...onboardingAnswers,
      superficie_totale: taxScanReview.superficieTotale,
      superficie_personnelle: taxScanReview.superficiePersonnelle,
      adresse_propriete: taxScanReview.adresse,
      unites_identifiees: taxScanReview.doors,
      calcul_portion_personnelle: "superficie",
      ...(taxScanReview.numeroLot ? { numero_lot: taxScanReview.numeroLot } : {}),
      ...(taxScanReview.valeurTerrain ? { valeur_terrain: taxScanReview.valeurTerrain } : {}),
      ...(taxScanReview.valeurBatiment ? { valeur_batiment: taxScanReview.valeurBatiment } : {}),
    };
    setOnboardingAnswers(updated);
    setTaxScanReview(null);
    playStepChime();

    // Recompute filtered questions with updated answers, then skip past any question
    // the confirmed scan already answered (e.g. the manual superficie_totale/
    // superficie_personnelle fallback questions) instead of asking for it twice.
    const allQs = selectedProfile ? QUESTIONS[selectedProfile] : [];
    const filteredQs = allQs.filter((q) => {
      if (!q.showWhen) return true;
      return updated[q.showWhen.questionId] === q.showWhen.value;
    });
    let nextIdx = currentQuestionIndex + 1;
    while (nextIdx < filteredQs.length && updated[filteredQs[nextIdx].id] !== undefined) {
      nextIdx++;
    }
    if (nextIdx < filteredQs.length) {
      setCurrentQuestionIndex(nextIdx);
    } else {
      setStep("summary");
    }
  };

  // ── Data Bridge — seeds BuildingLedger[] into FiscalContext on finish ────
  const { upsertBuilding } = useFiscal();

  const handleFinish = () => {
    if (!selectedProfile) return;
    if (playNotificationSound) playNotificationSound();

    if (selectedProfile === "investisseur") {
      const nbRaw      = String(onboardingAnswers["nb_immeubles"] ?? "1");
      const n          = Math.max(1, Math.min(99, parseInt(nbRaw, 10) || 1));
      const isOccupant = onboardingAnswers["proprietaire_occupant"] === "oui";

      // Resolve occupancy % from whichever calculation method the user chose
      let occupancyPct = 0;
      if (isOccupant) {
        const method = onboardingAnswers["calcul_portion_personnelle"];
        if (method === "superficie") {
          const total    = parseFloat(String(onboardingAnswers["superficie_totale"]    ?? "0"));
          const personal = parseFloat(String(onboardingAnswers["superficie_personnelle"] ?? "0"));
          occupancyPct   = (total > 0 && personal > 0)
            ? Math.min(99, Math.max(1, Math.round((personal / total) * 10000) / 100))
            : 0;
        } else if (method === "pourcentage") {
          const raw    = parseFloat(String(onboardingAnswers["proportion_occupee_exacte"] ?? "0"));
          occupancyPct = isNaN(raw) ? 0 : Math.min(99, Math.max(0, raw));
        } else {
          // Legacy fallback (proportion_occupee from old flow)
          const raw    = parseFloat(String(onboardingAnswers["proportion_occupee"] ?? "0"));
          occupancyPct = isNaN(raw) ? 0 : Math.min(99, Math.max(0, raw));
        }
      }
      const deductiblePct = Math.round((100 - occupancyPct) * 100) / 100;

      const rawCoOwners = onboardingAnswers["nb_coproprietaires"];
      const coOwners: CoOwner[] = Array.isArray(rawCoOwners)
        ? (rawCoOwners as any[]).map((o: any) => ({
            name:       String(o.name || ""),
            percentage: parseFloat(String(o.percentage || "0")) || 0,
          }))
        : [];

      // Scanned rôle-foncier data (if the user confirmed a scan) applies only to the
      // first building — that's the one the residence question chain was about.
      const scannedAddress       = String(onboardingAnswers["adresse_propriete"] ?? "");
      const scannedNumeroLot     = String(onboardingAnswers["numero_lot"] ?? "");
      const scannedValeurTerrain = String(onboardingAnswers["valeur_terrain"] ?? "");
      const scannedValeurBatiment = String(onboardingAnswers["valeur_batiment"] ?? "");
      const scannedDoors = Array.isArray(onboardingAnswers["unites_identifiees"])
        ? (onboardingAnswers["unites_identifiees"] as string[])
        : [];

      for (let i = 0; i < n; i++) {
        const isFirstOccupied = i === 0 && isOccupant;
        const ledger: BuildingLedger = {
          id:            `onboarding_building_${Date.now()}_${i}`,
          address:       i === 0 ? scannedAddress : "",
          type:          isFirstOccupied ? "owner_occupied" : "full_rental",
          occupancyPct:  isFirstOccupied ? occupancyPct  : 0,
          deductiblePct: isFirstOccupied ? deductiblePct : 100,
          coOwners:      i === 0 ? coOwners : [],
          ledgerId:      `ledger_${Date.now()}_${i}`,
          // Required by BuildingLedger interface (dataService.ts §1)
          ownerId:       auth.currentUser?.uid ?? "",
          createdAt:     new Date().toISOString(),
          // Firestore rejects `undefined` field values — only spread these keys when populated.
          ...(i === 0 && scannedNumeroLot     ? { numeroLot: scannedNumeroLot } : {}),
          ...(i === 0 && scannedValeurTerrain ? { valeurTerrain: Number(scannedValeurTerrain) } : {}),
          ...(i === 0 && scannedValeurBatiment ? { valeurBatiment: Number(scannedValeurBatiment) } : {}),
          ...(i === 0 && onboardingAnswers["superficie_totale"] ? { superficieTotalePi2: Number(onboardingAnswers["superficie_totale"]) } : {}),
        };
        upsertBuilding(ledger);

        // Seed empty UnitDoc placeholders for the scanned doors of the residence building,
        // so the gestion-immobiliaire module already shows every door once the user opens it.
        if (i === 0 && scannedDoors.length > 0) {
          const userId = auth.currentUser?.uid ?? "";
          if (userId) {
            scannedDoors.forEach((doorName, doorIdx) => {
              dataService.saveUnit(userId, {
                id: `onboarding_unit_${Date.now()}_${doorIdx}`,
                buildingId: ledger.id,
                unitName: doorName,
                tenantName: "",
                monthlyRent: 0,
                isActive: true,
              }).catch((e) => console.error("[Onboarding] saveUnit failed:", e));
            });
          }
        }
      }

    }

    onComplete(selectedProfile, lang, onboardingAnswers);
  };

  // ── Derived styling ───────────────────────────────────────────────────────
  const glassCard = darkMode
    ? "bg-[#090D1A]/55 border-emerald-500/20 shadow-emerald-950/20"
    : "bg-slate-50/60 border-emerald-500/20 shadow-slate-300/30";
  const pc = selectedProfile ? PROFILE_COLOR[selectedProfile] : null;

  // ── Left column (Sofi + bubble) ───────────────────────────────────────────
  const bubbleText = (step === "profile_select")
    ? t.greeting
    : step === "questions" && currentQuestion
      ? (lang === "FR" ? currentQuestion.subtitleFR : lang === "EN" ? currentQuestion.subtitleEN : currentQuestion.subtitleES)
        ?? (lang === "FR" ? "Répondez pour personnaliser votre expérience." : lang === "EN" ? "Answer to personalize your experience." : "Responde para personalizar tu experiencia.")
      : selectedProfile
        ? (lang === "FR"
          ? `Parfait ! Votre profil ${t.profiles[selectedProfile].label} est configuré. Cliquez sur « ${t.finish} » pour commencer !`
          : lang === "EN"
          ? `Perfect! Your ${t.profiles[selectedProfile].label} profile is set up. Click "${t.finish}" to begin!`
          : `¡Perfecto! Tu perfil ${t.profiles[selectedProfile].label} está configurado. ¡Haz clic en "${t.finish}" para comenzar!`)
        : t.greeting;

  const LeftColumn = () => (
    <div className="w-full md:w-[44%] flex flex-col items-center text-center md:text-left md:items-start space-y-6">
      {/* Sound toggle */}
      <button
        onClick={() => setSoundOn(!soundOn)}
        className={`p-2 rounded-full border bg-transparent cursor-pointer transition-all duration-300 active:scale-95 self-start ${
          darkMode
            ? "border-emerald-500/10 hover:border-emerald-500/35 text-zinc-400 hover:text-white"
            : "border-slate-200 hover:border-emerald-500/40 text-slate-500 hover:text-slate-900"
        }`}
        title="Sons de l'assistant"
      >
        {soundOn ? <Volume2 size={16} className="text-emerald-500" /> : <VolumeX size={16} />}
      </button>

      {/* ── SOFI Avatar — state-driven variant switching ── */}
      {/* Step 1 (welcome): soficompletablanco.png — waving, welcoming */}
      {/* Subsequent steps / idle: sofi completa mano baja.png — executive resting */}
      <div className="relative flex items-center justify-center w-full min-h-[280px] animate-fade-in">
        <SofiPresence
          variant={step === "profile_select" ? "welcome" : "idle"}
          height={step === "profile_select" ? 300 : 260}
          className="mx-auto"
        />
      </div>

      {/* Dialogue bubble */}
      <div
        className={`p-5 rounded-[28px] border text-left shadow-lg relative max-w-full animate-fade-in ${
          darkMode
            ? "bg-[#0A0E1A]/85 border-emerald-500/25 text-zinc-100 shadow-[0_4px_30px_rgba(16,185,129,0.06)]"
            : "bg-white/80 border-emerald-500/25 text-slate-800 shadow-[0_4px_30px_rgba(16,185,129,0.04)]"
        }`}
        style={{ animationDelay: "150ms" }}
      >
        <div className={`absolute top-[-10px] left-[50%] translate-x-[-50%] md:left-[-8px] md:top-14 md:translate-x-0 w-0 h-0 border-8 border-transparent ${
          darkMode
            ? "border-b-[#0a0e1a] md:border-b-transparent md:border-r-[#0a0e1a]"
            : "border-b-white md:border-b-transparent md:border-r-white"
        }`} />
        <p className="text-sm md:text-[14px] font-medium leading-relaxed">{bubbleText}</p>
      </div>

      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
        <Sparkles size={11} className="text-emerald-400" />
        <span>Sofi AI Assistant Active</span>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans antialiased transition-colors duration-500 ${
      darkMode ? "bg-black text-zinc-100" : "bg-white text-slate-800"
    }`}>
      {/* Background glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50" />

      {/* Main card */}
      <div className={`w-full max-w-5xl p-6 md:p-10 rounded-[44px] backdrop-blur-3xl border transition-all duration-300 shadow-2xl relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between overflow-hidden ${glassCard}`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.01] to-white/[0.03] pointer-events-none" />

        {/* Header controls */}
        <div className="absolute top-4 right-6 flex items-center space-x-3">
          <button
            onClick={() => { setDarkMode(!darkMode); if (playNotificationSound) playNotificationSound(); }}
            className={`p-2 rounded-full border bg-transparent cursor-pointer transition-all duration-300 active:scale-95 ${
              darkMode
                ? "border-emerald-500/10 hover:border-emerald-500/35 text-amber-400 hover:text-amber-300"
                : "border-slate-200 hover:border-emerald-500/40 text-slate-500 hover:text-indigo-600"
            }`}
            title={darkMode ? "Activer Mode Clair" : "Activer Mode Sombre"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Left column */}
        <LeftColumn />

        {/* Divider */}
        <div className="hidden md:block w-px h-80 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent self-center mx-2" />

        {/* ══ STEP 1: Profile Select ══════════════════════════════════════════ */}
        {step === "profile_select" && (
          <div className="w-full md:w-[50%] flex flex-col space-y-6 text-left">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight italic text-black dark:text-white">
                {t.profileHeading}
              </h2>
              <p className={`text-xs font-medium ${darkMode ? "text-zinc-450" : "text-slate-500"}`}>{t.subtitle}</p>
            </div>

            {/* Language selector */}
            <div className="space-y-2">
              <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                <Globe size={11} className="text-emerald-500" /><span>SÉLECTION DE LANGUE</span>
              </label>
              <div className={`flex p-1 rounded-full border max-w-[280px] backdrop-blur-md ${darkMode ? "bg-black/50 border-emerald-500/10" : "bg-slate-100 border-slate-200"}`}>
                {(["FR", "EN", "ES"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); if (playNotificationSound) playNotificationSound(); }}
                    className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border-none cursor-pointer ${
                      lang === l
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                        : "bg-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    {l === "FR" ? "Français" : l === "EN" ? "English" : "Español"}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile buttons */}
            <div className="space-y-2.5">
              <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>ROLES DISPONIBLES</label>
              <div className="flex flex-col gap-2.5 w-full max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {(["prospecteur","investisseur","flippeur","gestionnaire","syndicat"] as OnboardingProfile[]).map((p, i) => {
                  const themes = ["cyan","emerald","amber","indigo","purple"] as const;
                  const icons = [<FileSearch className="w-5 h-5"/>, <Building className="w-5 h-5"/>, <Hammer className="w-5 h-5"/>, <Briefcase className="w-5 h-5"/>, <Users className="w-5 h-5"/>];
                  return (
                    <React.Fragment key={p}>
                      <GlassRoleButton
                        colorTheme={themes[i]}
                        label={t.profiles[p].label}
                        description={t.profiles[p].desc}
                        icon={icons[i]}
                        onClick={() => handleProfileSelect(p)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Questions ═══════════════════════════════════════════════ */}
        {step === "questions" && selectedProfile && currentQuestion && (
          <div className="w-full md:w-[50%] flex flex-col space-y-5 text-left">
            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  {t.stepLabel(currentQuestionIndex + 1, totalQuestions)}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: `rgba(${pc?.rgb},1)` }}>
                  {t.profiles[selectedProfile].label}
                </span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-white/5" : "bg-slate-100"}`}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, rgba(${pc?.rgb},0.8), rgba(${pc?.rgb},1))` }}
                />
              </div>
            </div>

            {/* Question title */}
            <div className="space-y-1 animate-fade-in">
              <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-black dark:text-white leading-snug">
                {lang === "FR" ? currentQuestion.titleFR : lang === "EN" ? currentQuestion.titleEN : currentQuestion.titleES}
              </h2>
            </div>

            {/* ── single_choice ───────────────────────────────────────────── */}
            {currentQuestion.type === "single_choice" && (
              <div className="flex flex-col gap-3 animate-fade-in">

                {/* ── S.O.F.I. AI Tax Scanner — shown only on calcul_portion_personnelle ── */}
                {currentQuestion.id === "calcul_portion_personnelle" && (
                  <div className={`relative overflow-hidden rounded-2xl border p-4 ${
                    darkMode
                      ? "bg-gradient-to-br from-emerald-950/50 to-cyan-950/40 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
                      : "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-400/40 shadow-[0_4px_20px_rgba(16,185,129,0.08)]"
                  }`}>
                    {/* Decorative glow orb */}
                    <div className="absolute top-[-20px] right-[-20px] w-24 h-24 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        darkMode ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-emerald-100 border border-emerald-200"
                      }`}>
                        <Scan size={18} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${
                          darkMode ? "text-emerald-400" : "text-emerald-700"
                        }`}>
                          {lang === "FR" ? "✦ S.O.F.I. Scan Fiscal AI" : lang === "EN" ? "✦ S.O.F.I. AI Tax Scan" : "✦ S.O.F.I. Escaneo Fiscal IA"}
                        </p>
                        <p className={`text-[11px] font-medium mt-0.5 leading-relaxed ${
                          darkMode ? "text-zinc-400" : "text-slate-500"
                        }`}>
                          {lang === "FR"
                            ? "Importez votre acte notarié, évaluation municipale ou plan — S.O.F.I. extrait les superficies automatiquement."
                            : lang === "EN"
                            ? "Upload your deed, municipal assessment or blueprint — S.O.F.I. extracts square footage automatically."
                            : "Suba su escritura, evaluación municipal o plano — S.O.F.I. extrae las superficies automáticamente."}
                        </p>

                        {/* Error state */}
                        {taxScanError && (
                          <div className={`mt-2 flex items-start gap-2 text-[10px] font-semibold leading-snug ${
                            darkMode ? "text-rose-400" : "text-rose-600"
                          }`}>
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span>{taxScanError}</span>
                          </div>
                        )}

                        {/* Upload / scan button — hidden while a review is pending confirmation */}
                        {!taxScanReview && (
                          <button
                            onClick={() => {
                              setTaxScanError(null);
                              taxScanFileRef.current?.click();
                            }}
                            disabled={taxScanLoading}
                            className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer border ${
                              taxScanLoading
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            } ${
                              darkMode
                                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.1)]"
                                : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                            }`}
                          >
                            {taxScanLoading
                              ? <><Loader2 size={12} className="animate-spin" />{lang === "FR" ? "Analyse en cours…" : lang === "EN" ? "Scanning…" : "Analizando…"}</>
                              : <><Camera size={12} />{lang === "FR" ? "Analyser un document" : lang === "EN" ? "Scan a document" : "Escanear documento"}</>}
                          </button>
                        )}

                        {/* Hidden file input */}
                        <input
                          ref={taxScanFileRef}
                          type="file"
                          accept="application/pdf, image/jpeg, image/png, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleTaxDimensionScan(file);
                            e.target.value = "";
                          }}
                        />

                        {/* ── Review & confirm card — nothing is saved until "Confirmer" ── */}
                        {taxScanReview && (
                          <div className={`mt-3 space-y-3 rounded-xl border p-3 ${
                            darkMode ? "bg-black/20 border-emerald-500/20" : "bg-white/70 border-emerald-300/50"
                          }`}>
                            {/* Detected address */}
                            {taxScanReview.adresse && (
                              <p className={`text-[11px] font-semibold ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
                                {lang === "FR" ? "Adresse détectée : " : lang === "EN" ? "Detected address: " : "Dirección detectada: "}
                                <span className="font-black">{taxScanReview.adresse}</span>
                              </p>
                            )}

                            {/* Missing-superficie notice (informational, not blocking) */}
                            {!taxScanReview.superficieTotale && (
                              <div className={`flex items-start gap-2 text-[10px] font-semibold leading-snug rounded-lg p-2 ${
                                darkMode ? "bg-amber-950/30 text-amber-300 border border-amber-500/25" : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                <Info size={12} className="mt-0.5 shrink-0" />
                                <span>
                                  {lang === "FR"
                                    ? "Nous n'avons pas trouvé la superficie dans ce document — vous pouvez la saisir ci-dessous."
                                    : lang === "EN"
                                    ? "We couldn't find the square footage in this document — you can enter it below."
                                    : "No encontramos la superficie en este documento — puedes ingresarla abajo."}
                                </span>
                              </div>
                            )}

                            {/* Address mismatch — floating warning requiring explicit acknowledgment */}
                            {taxScanReview.addressMismatch && (
                              <div className={`space-y-2 rounded-lg p-2 border ${
                                darkMode ? "bg-rose-950/30 border-rose-500/30" : "bg-rose-50 border-rose-200"
                              }`}>
                                <div className={`flex items-start gap-2 text-[10px] font-semibold leading-snug ${darkMode ? "text-rose-300" : "text-rose-700"}`}>
                                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                  <span>
                                    {lang === "FR"
                                      ? "L'adresse postale du propriétaire ne correspond pas à l'adresse de la propriété. Confirmez-vous que vous y habitez ?"
                                      : lang === "EN"
                                      ? "The owner's mailing address doesn't match the property address. Do you confirm you live there?"
                                      : "La dirección postal del propietario no coincide con la dirección de la propiedad. ¿Confirmas que vives ahí?"}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setTaxScanReview((prev) => prev ? { ...prev, mismatchAcknowledged: true } : prev)}
                                    className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg border cursor-pointer ${
                                      taxScanReview.mismatchAcknowledged
                                        ? darkMode ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-emerald-100 border-emerald-400 text-emerald-700"
                                        : darkMode ? "bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {lang === "FR" ? "Oui, je confirme" : lang === "EN" ? "Yes, I confirm" : "Sí, confirmo"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTaxScanReview(null);
                                      const backIdx = questions.findIndex((q) => q.id === "proprietaire_occupant");
                                      if (backIdx >= 0) setCurrentQuestionIndex(backIdx);
                                    }}
                                    className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg border cursor-pointer ${
                                      darkMode ? "bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {lang === "FR" ? "Corriger ma réponse" : lang === "EN" ? "Fix my answer" : "Corregir mi respuesta"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Editable door list */}
                            <div className="space-y-1.5">
                              <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                {lang === "FR" ? "Portes détectées" : lang === "EN" ? "Detected doors" : "Puertas detectadas"}
                              </p>
                              {taxScanReview.doors.map((door, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={door}
                                    onChange={(e) => setTaxScanReview((prev) => {
                                      if (!prev) return prev;
                                      const doors = [...prev.doors]; doors[idx] = e.target.value;
                                      return { ...prev, doors };
                                    })}
                                    className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border bg-transparent outline-none text-[11px] font-semibold ${
                                      darkMode ? "border-white/10 text-white" : "border-slate-200 text-slate-900"
                                    }`}
                                  />
                                  <button
                                    onClick={() => setTaxScanReview((prev) => prev ? { ...prev, doors: prev.doors.filter((_, i) => i !== idx) } : prev)}
                                    className="text-rose-400 hover:text-rose-300 shrink-0 cursor-pointer transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => setTaxScanReview((prev) => prev ? { ...prev, doors: [...prev.doors, ""] } : prev)}
                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                                  darkMode ? "text-zinc-500 hover:text-zinc-200" : "text-slate-400 hover:text-slate-700"
                                }`}
                              >
                                <Plus size={11} /> {lang === "FR" ? "Ajouter une porte" : lang === "EN" ? "Add a door" : "Agregar una puerta"}
                              </button>
                            </div>

                            {/* Editable superficie inputs */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                  {lang === "FR" ? "Superficie totale (pi²)" : lang === "EN" ? "Total sq ft" : "Superficie total (pi²)"}
                                </label>
                                <input
                                  type="number"
                                  value={taxScanReview.superficieTotale}
                                  onChange={(e) => setTaxScanReview((prev) => prev ? { ...prev, superficieTotale: e.target.value } : prev)}
                                  className={`w-full px-2 py-1.5 rounded-lg border bg-transparent outline-none text-[13px] font-extrabold ${
                                    darkMode ? "border-white/10 text-white" : "border-slate-200 text-slate-900"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                                  {lang === "FR" ? "Votre unité (pi², estimé)" : lang === "EN" ? "Your unit (sq ft, estimated)" : "Tu unidad (pi², estimado)"}
                                </label>
                                <input
                                  type="number"
                                  value={taxScanReview.superficiePersonnelle}
                                  onChange={(e) => setTaxScanReview((prev) => prev ? { ...prev, superficiePersonnelle: e.target.value } : prev)}
                                  className={`w-full px-2 py-1.5 rounded-lg border bg-transparent outline-none text-[13px] font-extrabold ${
                                    darkMode ? "border-white/10 text-white" : "border-slate-200 text-slate-900"
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Confirm button — disabled until superficies are filled and any mismatch acknowledged */}
                            <button
                              onClick={handleConfirmTaxScanReview}
                              disabled={
                                !taxScanReview.superficieTotale.trim() ||
                                !taxScanReview.superficiePersonnelle.trim() ||
                                (taxScanReview.addressMismatch && !taxScanReview.mismatchAcknowledged)
                              }
                              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
                                taxScanReview.superficieTotale.trim() && taxScanReview.superficiePersonnelle.trim() && (!taxScanReview.addressMismatch || taxScanReview.mismatchAcknowledged)
                                  ? darkMode ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                  : "opacity-30 cursor-not-allowed border-slate-300/20 bg-transparent"
                              }`}
                            >
                              <CheckCircle2 size={13} />
                              {lang === "FR" ? "Confirmer" : lang === "EN" ? "Confirm" : "Confirmar"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className={`mt-4 flex items-center gap-3 ${
                      darkMode ? "text-zinc-600" : "text-slate-300"
                    }`}>
                      <div className="flex-1 h-px bg-current opacity-30" />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        darkMode ? "text-zinc-500" : "text-slate-400"
                      }`}>
                        {lang === "FR" ? "ou choisissez manuellement" : lang === "EN" ? "or choose manually" : "o elija manualmente"}
                      </span>
                      <div className="flex-1 h-px bg-current opacity-30" />
                    </div>
                  </div>
                )}

                {/* Choices */}
                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentQuestion.options?.map((opt) => {
                    const optLabel = lang === "FR" ? opt.labelFR : lang === "EN" ? opt.labelEN : opt.labelES;
                    const isSelected = onboardingAnswers[currentQuestion.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSingleAnswer(currentQuestion.id, opt.value)}
                        className={`relative overflow-hidden w-full text-left px-4 py-3 rounded-2xl backdrop-blur-md border transition-all duration-300 cursor-pointer group ${
                          isSelected
                            ? darkMode
                              ? `bg-white/10 border-[rgba(${pc?.rgb},0.6)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_20px_rgba(${pc?.rgb},0.2)]`
                              : `bg-white/60 border-[rgba(${pc?.rgb},0.6)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_0_20px_rgba(${pc?.rgb},0.15)]`
                            : darkMode
                              ? `bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-[rgba(${pc?.rgb},0.4)]`
                              : `bg-white/50 border-slate-200 hover:border-[rgba(${pc?.rgb},0.4)] hover:bg-white/80`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {opt.icon && <span style={{ color: `rgba(${pc?.rgb},1)` }} className="opacity-70">{opt.icon}</span>}
                          <span className="text-[13px] font-semibold">{optLabel}</span>
                          {isSelected && <CheckCircle2 size={16} className="ml-auto shrink-0" style={{ color: `rgba(${pc?.rgb},1)` }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── multi_choice ────────────────────────────────────────────── */}
            {currentQuestion.type === "multi_choice" && (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar animate-fade-in">
                {currentQuestion.options?.map((opt) => {
                  const optLabel = lang === "FR" ? opt.labelFR : lang === "EN" ? opt.labelEN : opt.labelES;
                  const isChecked = multiPending.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleMultiToggle(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isChecked
                          ? darkMode ? `bg-white/10 border-[rgba(${pc?.rgb},0.5)]` : `bg-white/60 border-[rgba(${pc?.rgb},0.5)]`
                          : darkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-white/50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${isChecked ? "" : darkMode ? "border-white/20" : "border-slate-300"}`}
                          style={isChecked ? { backgroundColor: `rgba(${pc?.rgb},1)`, borderColor: `rgba(${pc?.rgb},1)` } : {}}>
                          {isChecked && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                        <span className="text-[13px] font-semibold">{optLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {currentQuestion.type === "multi_choice" && (
              <button
                onClick={() => handleMultiConfirm(currentQuestion.id)}
                disabled={multiPending.length === 0}
                className={`w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
                  multiPending.length > 0
                    ? darkMode ? "bg-white/10 border-emerald-500/40 text-emerald-400 hover:bg-white/15" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/20"
                    : "opacity-30 cursor-not-allowed border-slate-300/20 bg-transparent"
                }`}
              >
                {t.next} ({multiPending.length}) →
              </button>
            )}

            {/* ── co_owner_split ──────────────────────────────────────────── */}
            {currentQuestion.type === "co_owner_split" && (
              <div className="space-y-3 animate-fade-in">
                {coOwners.map((owner, idx) => (
                  <div key={idx} className={`flex items-center gap-2 p-3 rounded-2xl border ${darkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-white/60 border-slate-200"}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest w-5 text-center shrink-0 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{idx + 1}</span>
                    <input
                      type="text"
                      placeholder={lang === "FR" ? "Nom du copropriétaire" : lang === "EN" ? "Co-owner name" : "Nombre del copropietario"}
                      value={owner.name}
                      onChange={(e) => { const u = [...coOwners]; u[idx] = { ...u[idx], name: e.target.value }; setCoOwners(u); }}
                      className={`flex-1 min-w-0 bg-transparent outline-none text-[12px] font-semibold ${darkMode ? "text-white placeholder-zinc-600" : "text-slate-900 placeholder-slate-300"}`}
                    />
                    <input
                      type="number" min={1} max={99} placeholder="%"
                      value={owner.percentage}
                      onChange={(e) => { const u = [...coOwners]; u[idx] = { ...u[idx], percentage: e.target.value }; setCoOwners(u); }}
                      className={`w-14 bg-transparent outline-none text-[12px] font-black text-right ${darkMode ? "text-emerald-400 placeholder-zinc-600" : "text-emerald-700 placeholder-slate-300"}`}
                    />
                    <span className={`text-[10px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>%</span>
                    {coOwners.length > 1 && (
                      <button onClick={() => setCoOwners(coOwners.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-300 shrink-0 cursor-pointer transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setCoOwners([...coOwners, { name: "", percentage: "" }])}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${darkMode ? "text-zinc-500 hover:text-zinc-200" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <Plus size={11} /> {lang === "FR" ? "Ajouter un copropriétaire" : lang === "EN" ? "Add co-owner" : "Agregar copropietario"}
                </button>
                {/* Total validation badge */}
                <div className={`flex items-center justify-between text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2 ${
                  Math.abs(coOwnerTotal - 100) < 0.01
                    ? darkMode ? "bg-emerald-950/30 text-emerald-400 border border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : darkMode ? "bg-rose-950/30 text-rose-400 border border-rose-500/30" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    {Math.abs(coOwnerTotal - 100) >= 0.01 && <AlertTriangle size={10} />}
                    {coOwnerTotal.toFixed(1)} %
                    {Math.abs(coOwnerTotal - 100) < 0.01 && <CheckCircle2 size={10} />}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (!coOwnerValid) return;
                    setOnboardingAnswers((prev) => ({ ...prev, [currentQuestion.id]: coOwners as any }));
                    if (currentQuestionIndex < totalQuestions - 1) { setCurrentQuestionIndex((i) => i + 1); setMultiPending([]); }
                    else { setStep("summary"); }
                    playStepChime();
                  }}
                  disabled={!coOwnerValid}
                  className={`w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
                    coOwnerValid
                      ? darkMode ? "bg-white/10 border-emerald-500/40 text-emerald-400 hover:bg-white/15" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/20"
                      : "opacity-30 cursor-not-allowed border-slate-300/20 bg-transparent"
                  }`}
                >
                  {lang === "FR" ? "Confirmer la répartition (100 %)" : lang === "EN" ? "Confirm split (100%)" : "Confirmar reparto (100%)"}
                </button>
              </div>
            )}

            {/* ── number_input ────────────────────────────────────────────── */}
            {currentQuestion.type === "number_input" && (
              <div className="space-y-3 animate-fade-in">
                {currentQuestion.tooltipFR && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl border text-[10px] font-medium leading-relaxed ${
                    darkMode ? "bg-indigo-950/30 border-indigo-500/25 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  }`}>
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>{lang === "FR" ? currentQuestion.tooltipFR : currentQuestion.tooltipFR}</span>
                  </div>
                )}
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-white/60 border-slate-200"}`}>
                  <input
                    type="number"
                    min={currentQuestion.min ?? 0}
                    max={currentQuestion.max ?? 999}
                    placeholder={lang === "FR" ? currentQuestion.placeholder?.FR : lang === "EN" ? currentQuestion.placeholder?.EN : currentQuestion.placeholder?.ES}
                    value={numberInputVal}
                    onChange={(e) => setNumberInputVal(e.target.value)}
                    className={`flex-1 bg-transparent outline-none text-2xl font-extrabold ${darkMode ? "text-white placeholder-zinc-700" : "text-slate-900 placeholder-slate-300"}`}
                  />
                  {currentQuestion.id === "proportion_occupee" && numberInputVal && (
                    <div className={`text-right text-[10px] font-black leading-tight ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                      <div>{numberInputVal}% occupé</div>
                      <div className="text-[9px] opacity-75">→ {(100 - Number(numberInputVal)).toFixed(0)}% déductible</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!numberInputVal.trim()) return;
                    setOnboardingAnswers((prev) => ({ ...prev, [currentQuestion.id]: numberInputVal }));
                    setNumberInputVal("");
                    if (currentQuestionIndex < totalQuestions - 1) { setCurrentQuestionIndex((i) => i + 1); }
                    else { setStep("summary"); }
                    playStepChime();
                  }}
                  disabled={!numberInputVal.trim()}
                  className={`w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
                    numberInputVal.trim()
                      ? darkMode ? "bg-white/10 border-emerald-500/40 text-emerald-400 hover:bg-white/15" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/20"
                      : "opacity-30 cursor-not-allowed border-slate-300/20 bg-transparent"
                  }`}
                >
                  {t.next} →
                </button>
              </div>
            )}

            {/* Back */}
            <button
              onClick={handleBack}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer self-start ${darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ArrowLeft size={12} /> {t.back}
            </button>
          </div>
        )}

        {/* ══ STEP 3: Summary ═════════════════════════════════════════════════ */}
        {step === "summary" && selectedProfile && (
          <div className="w-full md:w-[50%] flex flex-col space-y-6 text-left animate-fade-in">
            <div className="space-y-1">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${darkMode ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20" : "border-emerald-500/30 text-emerald-700 bg-emerald-50"}`}>
                <CheckCircle2 size={11} />
                {lang === "FR" ? "Profil configuré" : lang === "EN" ? "Profile configured" : "Perfil configurado"}
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight italic text-black dark:text-white">
                {t.profiles[selectedProfile].label}
              </h2>
            </div>

            {/* Answer summary */}
            <div className={`space-y-2 p-4 rounded-2xl border ${darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-white/50 border-slate-100"}`}>
              {Object.entries(onboardingAnswers).map(([qId, ans]) => {
                const q = allQuestions.find((q) => q.id === qId);
                if (!q) return null;
                const title = lang === "FR" ? q.titleFR : lang === "EN" ? q.titleEN : q.titleES;
                const display = Array.isArray(ans)
                  ? (ans as any[]).every((a) => a.name !== undefined)
                    ? (ans as CoOwnerEntry[]).map((o) => `${o.name} ${o.percentage}%`).join(", ")
                    : (ans as string[]).join(", ")
                  : ans;
                return (
                  <div key={qId} className={`text-[10px] ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    <span className="font-black">{title}:</span> <span>{String(display)}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 shadow-lg"
              style={{ background: `linear-gradient(135deg, rgba(${pc?.rgb},0.9), rgba(${pc?.rgb},1))`, color: "white", boxShadow: `0 8px 32px rgba(${pc?.rgb},0.3)` }}
            >
              {t.finish} <ArrowRight size={14} className="inline ml-1" />
            </button>

            <button
              onClick={handleBack}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer self-start ${darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ArrowLeft size={12} /> {t.back}
            </button>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        @keyframes sofiRobotFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .animate-fade-in { animation: onboardingFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes onboardingFadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.15); border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.3); }
      `}</style>
    </div>
  );
}
