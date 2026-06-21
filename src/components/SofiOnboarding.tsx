import React, { useState, useEffect } from "react";
import {
  Sparkles, Globe, FileSearch, Building, Hammer, Briefcase,
  Users, Volume2, VolumeX, Sun, Moon,
  ArrowRight, ArrowLeft, CheckCircle2,
  Building2, UserCheck, Home,
  Plus, Trash2, Info, AlertTriangle,
} from "lucide-react";
import GlassRoleButton from "./GlassRoleButton";
import { SofiAvatarSVG } from "./SofiAvatarSVG";
import { SofiPresence } from "./SofiPresence";

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
      id: "volume_transactions",
      type: "single_choice",
      titleFR: "Combien de transactions visez-vous par année ?",
      titleEN: "How many transactions are you targeting per year?",
      titleES: "¿Cuántas transacciones planeas por año?",
      subtitleFR: "Cela nous aide à calibrer vos outils de suivi de dossiers.",
      subtitleEN: "This helps us calibrate your file tracking tools.",
      subtitleES: "Esto nos ayuda a calibrar tus herramientas de seguimiento.",
      options: [
        { value: "1_10",    labelFR: "1 à 10",     labelEN: "1 to 10",     labelES: "1 a 10"    },
        { value: "11_50",   labelFR: "11 à 50",    labelEN: "11 to 50",    labelES: "11 a 50"   },
        { value: "plus_50", labelFR: "Plus de 50", labelEN: "More than 50", labelES: "Más de 50" },
      ],
    },
    {
      id: "tps_tvq_registered",
      type: "single_choice",
      titleFR: "Êtes-vous inscrit aux fichiers de la TPS/TVQ ?",
      titleEN: "Are you registered for GST/QST?",
      titleES: "¿Estás inscrito en los archivos de GST/QST?",
      subtitleFR: "Le module TPS/TVQ inclut un tracker d'alerte à 27 000 $ et un verrou de conformité à 30 000 $.",
      subtitleEN: "The GST/QST module includes a $27,000 alert tracker and a $30,000 compliance lock.",
      subtitleES: "El módulo GST/QST incluye un rastreador de alerta a $27,000 y un bloqueo de cumplimiento a $30,000.",
      options: [
        { value: "oui",      labelFR: "Oui",                    labelEN: "Yes",                       labelES: "Sí"                       },
        { value: "non",      labelFR: "Non",                    labelEN: "No",                        labelES: "No"                       },
        { value: "en_cours", labelFR: "En cours d'inscription", labelEN: "Registration in progress",  labelES: "En proceso de inscripción" },
      ],
    },
    {
      id: "bureau_domicile",
      type: "single_choice",
      titleFR: "Avez-vous un bureau à domicile ?",
      titleEN: "Do you have a home office?",
      titleES: "¿Tienes una oficina en casa?",
      subtitleFR: "Le module Bureau à domicile calcule automatiquement votre déduction fiscale.",
      subtitleEN: "The Home Office module automatically calculates your tax deduction.",
      subtitleES: "El módulo Oficina en Casa calcula automáticamente tu deducción fiscal.",
      options: [
        { value: "oui_exclusif", labelFR: "Oui, un espace exclusif", labelEN: "Yes, an exclusive space", labelES: "Sí, un espacio exclusivo",  icon: <Home size={14}/> },
        { value: "oui_partage",  labelFR: "Oui, un espace partagé",  labelEN: "Yes, a shared space",     labelES: "Sí, un espacio compartido", icon: <Home size={14}/> },
        { value: "non",          labelFR: "Non",                      labelEN: "No",                      labelES: "No"                         },
      ],
    },
  ],

  // ── B. Investisseur — Phase 5 (Quebec-FR approved 2026-06-18) ─────────────
  // Architectural rule: 1 building = 1 separate Tenue de Livres ledger.
  investisseur: [
    {
      id: "nb_coproprietaires",
      type: "co_owner_split",
      titleFR: "Combien de copropriétaires détiennent l'immeuble ?",
      titleEN: "How many co-owners hold the property?",
      titleES: "¿Cuántos copropietarios tienen el inmueble?",
      subtitleFR: "Si > 1, entrez le nom et le pourcentage de chaque copropriétaire. Le total doit être exactement 100 %.",
      subtitleEN: "If > 1, enter each co-owner's name and percentage. Total must equal exactly 100%.",
      subtitleES: "Si > 1, ingresa nombre y porcentaje de cada copropietario. El total debe ser exactamente 100%.",
    },
    {
      id: "proprietaire_occupant",
      type: "single_choice",
      titleFR: "Êtes-vous propriétaire occupant ?",
      titleEN: "Are you an owner-occupant?",
      titleES: "¿Eres propietario ocupante?",
      subtitleFR: "Si oui, la proportion occupée personnellement sera déduite du calcul de déduction (ex : triplex 33 % occupé → 66 % déductible).",
      subtitleEN: "If yes, the personally occupied portion is excluded from deductions (e.g. 33% occupied triplex → 66% deductible).",
      subtitleES: "Si es así, la porción personalmente ocupada se excluye de las deducciones.",
      options: [
        { value: "oui", labelFR: "Oui", labelEN: "Yes", labelES: "Sí" },
        { value: "non", labelFR: "Non", labelEN: "No",  labelES: "No" },
      ],
    },
    {
      id: "proportion_occupee",
      type: "number_input",
      titleFR: "Quelle proportion de l'immeuble occupez-vous personnellement ?",
      titleEN: "What proportion of the building do you personally occupy?",
      titleES: "¿Qué proporción del edificio ocupas personalmente?",
      subtitleFR: "Ex : 33 % pour un triplex dont vous habitez une unité sur trois.",
      subtitleEN: "E.g. 33% for a triplex where you occupy one unit of three.",
      subtitleES: "Ej.: 33% para un triplex donde ocupas una de tres unidades.",
      tooltipFR: "Ce pourcentage configure la portion déductible dans votre Tenue de Livres. Exemple : 33 % occupé = 67 % des dépenses d'immeuble sont déductibles.",
      showWhen: { questionId: "proprietaire_occupant", value: "oui" },
      min: 1, max: 99,
      placeholder: { FR: "Ex : 33", EN: "E.g. 33", ES: "Ej.: 33" },
    },
    {
      id: "nb_immeubles",
      type: "number_input",
      titleFR: "Combien d'immeubles différents gérez-vous actuellement ?",
      titleEN: "How many different properties do you currently manage?",
      titleES: "¿Cuántos inmuebles distintos administras actualmente?",
      subtitleFR: "Chaque immeuble génère une Tenue de Livres distincte avec ses propres règles de déduction.",
      subtitleEN: "Each property generates a distinct bookkeeping ledger with its own deduction rules.",
      subtitleES: "Cada inmueble genera un libro contable distinto con sus propias reglas de deducción.",
      min: 1, max: 99,
      placeholder: { FR: "Ex : 3", EN: "E.g. 3", ES: "Ej.: 3" },
    },
  ],

  // ── C. Flippeur ───────────────────────────────────────────────────────────
  flippeur: [
    {
      id: "nb_projets_annee",
      type: "single_choice",
      titleFR: "Combien de projets de flip réalisez-vous par année ?",
      titleEN: "How many flip projects do you complete per year?",
      titleES: "¿Cuántos proyectos de flip realizas por año?",
      options: [
        { value: "1_2",    labelFR: "1 à 2",    labelEN: "1 to 2",     labelES: "1 a 2"    },
        { value: "3_5",    labelFR: "3 à 5",    labelEN: "3 to 5",     labelES: "3 a 5"    },
        { value: "6_plus", labelFR: "6 et plus", labelEN: "6 and more", labelES: "6 o más"  },
      ],
    },
    {
      id: "financement",
      type: "single_choice",
      titleFR: "Quel est votre mode de financement principal ?",
      titleEN: "What is your main financing method?",
      titleES: "¿Cuál es tu principal método de financiamiento?",
      options: [
        { value: "prive",     labelFR: "Prêt privé / Capital propre", labelEN: "Private loan / Own capital",       labelES: "Préstamo privado / Capital propio" },
        { value: "hypotheque",labelFR: "Hypothèque bancaire",          labelEN: "Bank mortgage",                    labelES: "Hipoteca bancaria"                  },
        { value: "mixte",     labelFR: "Mixte",                        labelEN: "Mixed",                            labelES: "Mixto"                               },
      ],
    },
  ],

  // ── D. Gestionnaire ───────────────────────────────────────────────────────
  gestionnaire: [
    {
      id: "nb_clients",
      type: "single_choice",
      titleFR: "Combien de clients/propriétaires gérez-vous ?",
      titleEN: "How many clients/owners do you manage?",
      titleES: "¿Cuántos clientes/propietarios administras?",
      options: [
        { value: "1_5",    labelFR: "1 à 5",    labelEN: "1 to 5",     labelES: "1 a 5"    },
        { value: "6_20",   labelFR: "6 à 20",   labelEN: "6 to 20",    labelES: "6 a 20"   },
        { value: "21_plus",labelFR: "21 et plus",labelEN: "21 and more", labelES: "21 y más" },
      ],
    },
  ],

  // ── E. Syndicat ───────────────────────────────────────────────────────────
  syndicat: [
    {
      id: "nb_unites",
      type: "single_choice",
      titleFR: "Combien d'unités compte votre copropriété ?",
      titleEN: "How many units does your condominium have?",
      titleES: "¿Cuántas unidades tiene su condominio?",
      options: [
        { value: "2_10",    labelFR: "2 à 10",    labelEN: "2 to 10",    labelES: "2 a 10"    },
        { value: "11_50",   labelFR: "11 à 50",   labelEN: "11 to 50",   labelES: "11 a 50"   },
        { value: "51_plus", labelFR: "51 et plus", labelEN: "51 and more", labelES: "51 o más"  },
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

  const handleFinish = () => {
    if (!selectedProfile) return;
    if (playNotificationSound) playNotificationSound();
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
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar animate-fade-in">
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
