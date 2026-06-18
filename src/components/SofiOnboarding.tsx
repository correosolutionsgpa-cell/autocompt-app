import React, { useState, useEffect } from "react";
import { Sparkles, Globe, FileSearch, Building, Hammer, Briefcase, Users, Volume2, VolumeX, Sun, Moon } from "lucide-react";
import GlassRoleButton from "./GlassRoleButton";

interface SofiOnboardingProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onComplete: (profile: string, lang: "FR" | "EN" | "ES") => void;
  playNotificationSound?: () => void;
}

// PROFILE_STYLES removed — styling is now encapsulated in GlassRoleButton via colorTheme prop

export default function SofiOnboarding({ darkMode, setDarkMode, onComplete, playNotificationSound }: SofiOnboardingProps) {
  const [lang, setLang] = useState<"FR" | "EN" | "ES">("FR");
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Play assistant greeting chime
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
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc1.frequency.setValueAtTime(1046.50, now + 0.3); // C6

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.setValueAtTime(329.63, now + 0.1); // E4
      osc2.frequency.setValueAtTime(392.00, now + 0.2); // G4

      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.65);
      osc2.start(now);
      osc2.stop(now + 0.65);
      
      setAudioPlayed(true);
    } catch (e) {
      console.warn("Audio autoplay blocked by browser policy. Chime will play upon user click.", e);
    }
  }, [soundOn]);

  useEffect(() => {
    playGreetingChime();
    
    const handleFirstInteraction = () => {
      if (!audioPlayed) {
        playGreetingChime();
        window.removeEventListener("click", handleFirstInteraction);
      }
    };
    window.addEventListener("click", handleFirstInteraction);
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
    };
  }, [playGreetingChime, audioPlayed]);

  // Translations
  const content = {
    FR: {
      greeting: "Bonjour ! Je suis Sofi, votre assistante IA d'AutoCompt experte en fiscalité immobilière. Je vais vous guider dans la configuration de votre profil afin d'automatiser entièrement votre comptabilité !",
      subtitle: "Choisissez votre spécialité pour lancer l'automatisation intelligente.",
      profileHeading: "Quel est votre profil principal ?",
      profiles: {
        prospecteur: {
          label: "Prospecteur Immobilier",
          desc: "Outils DocuLégal intégrés pour simplifier votre travail sur le terrain.",
          icon: <FileSearch className="w-5 h-5" />
        },
        investisseur: {
          label: "Investisseur Immobilier",
          desc: "Tenue de livres automatisée et distincte pour chacun de vos immeubles.",
          icon: <Building className="w-5 h-5" />
        },
        flippeur: {
          label: "Flippeur Immobilier",
          desc: "Centralisez votre comptabilité de chantier. Ne perdez plus aucune facture\u00A0!",
          icon: <Hammer className="w-5 h-5" />
        },
        gestionnaire: {
          label: "Gestionnaire Immobilier",
          desc: "Automatisez et organisez la comptabilité pour le portefeuille de chaque client.",
          icon: <Briefcase className="w-5 h-5" />
        },
        syndicat: {
          label: "Syndicat de Copropriété",
          desc: "Une administration transparente pour bâtir la confiance des copropriétaires.",
          icon: <Users className="w-5 h-5" />
        }
      }
    },
    EN: {
      greeting: "Hello! I am Sofi, your AutoCompt AI assistant expert in real estate taxation. I will guide you through your profile setup to fully automate your bookkeeping!",
      subtitle: "Choose your specialty to boot up smart automation.",
      profileHeading: "What is your main profile?",
      profiles: {
        prospecteur: {
          label: "Property Finder",
          desc: "Integrated DocuLégal tools to simplify your work in the field.",
          icon: <FileSearch className="w-5 h-5" />
        },
        investisseur: {
          label: "Real Estate Investor",
          desc: "Automated and separate bookkeeping for each of your properties.",
          icon: <Building className="w-5 h-5" />
        },
        flippeur: {
          label: "Property Flipper",
          desc: "Centralize your construction site accounting. Never lose a single invoice!",
          icon: <Hammer className="w-5 h-5" />
        },
        gestionnaire: {
          label: "Property Manager",
          desc: "Automate and organize accounting for each client's portfolio.",
          icon: <Briefcase className="w-5 h-5" />
        },
        syndicat: {
          label: "Condominium Association",
          desc: "Transparent administration to build co-owners' trust.",
          icon: <Users className="w-5 h-5" />
        }
      }
    },
    ES: {
      greeting: "¡Hola! Soy Sofi, tu asistente de IA de AutoCompt experta en fiscalidad inmobiliaria. ¡Te guiaré en la configuración de tu perfil para automatizar completamente tu contabilidad!",
      subtitle: "Elige tu especialidad para activar la automatización inteligente.",
      profileHeading: "¿Cuál es tu perfil principal?",
      profiles: {
        prospecteur: {
          label: "Buscador de Inmuebles",
          desc: "Herramientas de DocuLégal integradas para simplificar tu trabajo de campo.",
          icon: <FileSearch className="w-5 h-5" />
        },
        investisseur: {
          label: "Inversor Inmobiliario",
          desc: "Contabilidad automatizada e independiente para cada uno de tus edificios.",
          icon: <Building className="w-5 h-5" />
        },
        flippeur: {
          label: "Flippeur Inmobiliario",
          desc: "Centraliza la contabilidad de tu obra. ¡No pierdas ninguna factura!",
          icon: <Hammer className="w-5 h-5" />
        },
        gestionnaire: {
          label: "Gestor Inmobiliario",
          desc: "Automatiza y organiza la contabilidad para la cartera de cada cliente.",
          icon: <Briefcase className="w-5 h-5" />
        },
        syndicat: {
          label: "Asociación de Copropietarios",
          desc: "Una administración transparente para generar confianza en los copropietarios.",
          icon: <Users className="w-5 h-5" />
        }
      }
    }
  };

  const handleProfileSelect = (profile: string) => {
    if (playNotificationSound) playNotificationSound();
    onComplete(profile, lang);
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans antialiased transition-colors duration-500 ${
      darkMode 
        ? "bg-black text-zinc-100" 
        : "bg-white text-slate-800"
    }`}>
      {/* Background Cybernetic Grid & Glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-[130px] pointer-events-none" />
      
      {/* Dynamic line overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50" />

      {/* Main glassmorphism card */}
      <div className={`w-full max-w-5xl p-6 md:p-10 rounded-[44px] backdrop-blur-3xl border transition-all duration-300 shadow-2xl relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between overflow-hidden ${
        darkMode 
          ? "bg-[#090D1A]/55 border-emerald-500/20 shadow-emerald-950/20" 
          : "bg-slate-50/60 border-emerald-500/20 shadow-slate-300/30"
      }`}>
        {/* Dynamic header visual flare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.01] to-white/[0.03] pointer-events-none" />

        {/* Top Controls: Theme Toggle */}
        <div className="absolute top-4 right-6 flex items-center space-x-3">
          {/* Theme Toggle (Sun/Moon) */}
          <button 
            onClick={() => {
              setDarkMode(!darkMode);
              if (playNotificationSound) playNotificationSound();
            }}
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

        {/* Column 1: Custom Recreated Sofi Avatar (Reference Model styled) & Greeting */}
        <div className="w-full md:w-[44%] flex flex-col items-center text-center md:text-left md:items-start space-y-6">
          
          {/* Sound Toggle (Moved to top-left relative to the robot component, directly above it) */}
          <button 
            onClick={() => {
              setSoundOn(!soundOn);
              if (!soundOn) {
                setTimeout(() => {
                  try {
                    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioCtx) {
                      const ctx = new AudioCtx();
                      const now = ctx.currentTime;
                      const osc = ctx.createOscillator();
                      const g = ctx.createGain();
                      osc.connect(g);
                      g.connect(ctx.destination);
                      osc.frequency.setValueAtTime(650, now);
                      g.gain.setValueAtTime(0.04, now);
                      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                      osc.start(now);
                      osc.stop(now + 0.2);
                    }
                  } catch(e){}
                }, 50);
              }
            }}
            className={`p-2 rounded-full border bg-transparent cursor-pointer transition-all duration-300 active:scale-95 self-start ${
              darkMode 
                ? "border-emerald-500/10 hover:border-emerald-500/35 text-zinc-400 hover:text-white" 
                : "border-slate-200 hover:border-emerald-500/40 text-slate-500 hover:text-slate-900"
            }`}
            title="Sons de l'assistant"
          >
            {soundOn ? <Volume2 size={16} className="text-emerald-500" /> : <VolumeX size={16} />}
          </button>
          
          {/* Sofi Robot 3D Figure Container */}
          <div className="relative flex items-center justify-center w-full min-h-[220px] animate-fade-in">
            {/* Soft Shadow under the robot */}
            <div className="absolute bottom-[-15px] w-28 h-3.5 rounded-full bg-emerald-950/20 dark:bg-emerald-950/30 blur-md animate-pulse" />
            
            {/* SVG Robot Figure (recreated matching the 3D toy reference layout) */}
            <div className="relative w-40 h-48 z-10 select-none"
                 style={{
                   animation: "sofiRobotFloat 6s ease-in-out infinite"
                 }}>
              <svg viewBox="0 0 160 200" className="w-full h-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                <defs>
                  {/* Glowing filter */}
                  <filter id="sofiGreenGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Soft 3D lighting gradients */}
                  <linearGradient id="bodyShade" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="40%" stopColor="#FAFAFA" />
                    <stop offset="100%" stopColor="#D4D4D8" />
                  </linearGradient>
                  <linearGradient id="jointShade" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#27272A" />
                    <stop offset="100%" stopColor="#09090B" />
                  </linearGradient>
                </defs>

                {/* --- ROBOT BODY JOINTS --- */}
                {/* Neck Joint */}
                <rect x="72" y="86" width="16" height="12" rx="2" fill="url(#jointShade)" stroke="#09090B" strokeWidth="0.5" />
                <line x1="72" y1="91" x2="88" y2="91" stroke="#3F3F46" strokeWidth="1" />
                
                {/* Waist belt */}
                <rect x="62" y="160" width="36" height="7" rx="3.5" fill="url(#jointShade)" stroke="#09090B" strokeWidth="0.5" />
                
                {/* Hip Joints */}
                <circle cx="68" cy="173" r="5" fill="#18181B" />
                <circle cx="92" cy="173" r="5" fill="#18181B" />

                {/* Thighs */}
                <path d="M63,174 C63,174 63,192 63,192 C63,194 73,194 73,192 C73,192 73,174 73,174 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                <path d="M87,174 C87,174 87,192 87,192 C87,194 97,194 97,192 C97,192 97,174 97,174 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />

                {/* --- ROBOT LEFT ARM (On side) --- */}
                {/* Shoulder joint */}
                <circle cx="118" cy="106" r="6" fill="#D4D4D8" stroke="#A1A1AA" strokeWidth="0.5" />
                {/* Upper arm */}
                <path d="M117,106 L125,128 C126,130 122,132 120,129 L112,108 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                {/* Elbow joint */}
                <circle cx="122" cy="129" r="4.5" fill="url(#jointShade)" />
                {/* Forearm */}
                <path d="M122,129 L117,148 C116,150 112,149 113,146 L118,128 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                {/* Hand */}
                <circle cx="115" cy="149" r="4" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />


                {/* --- ROBOT TORSO (Chest Plate) --- */}
                {/* Chest Base */}
                <path d="M50,96 L110,96 C116,96 118,102 116,110 L104,152 C102,158 96,160 80,160 C64,160 58,158 56,152 L44,110 C42,102 44,96 50,96 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.6" />
                
                {/* Official AutoCompt App Logo on Chest */}
                <foreignObject x="61" y="109" width="38" height="38">
                  <div className="w-full h-full bg-black rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-500 shadow-sm shadow-emerald-500/30">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                </foreignObject>


                {/* --- ROBOT RIGHT ARM (Pointing Up) --- */}
                {/* Shoulder joint */}
                <circle cx="42" cy="106" r="6" fill="#D4D4D8" stroke="#A1A1AA" strokeWidth="0.5" />
                {/* Upper arm */}
                <path d="M38,106 L25,85 C23,82 26,79 28,81 L41,102 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                {/* Elbow joint */}
                <circle cx="26" cy="83" r="4.5" fill="url(#jointShade)" />
                {/* Forearm */}
                <path d="M26,83 L26,53 C26,50 30,50 30,53 L30,83 Z" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                {/* Hand/Fist */}
                <circle cx="28" cy="51" r="4.5" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                {/* Folded knuckles circle */}
                <circle cx="29" cy="49" r="1.8" fill="#A1A1AA" />
                <circle cx="31.5" cy="51" r="1.8" fill="#A1A1AA" />
                {/* Pointing Index Finger */}
                <rect x="26.5" y="34" width="3" height="13" rx="1.5" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />


                {/* --- ROBOT HEAD --- */}
                {/* Ear Cups (headphones) */}
                <ellipse cx="33" cy="52" rx="6.5" ry="12" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                <rect x="30" y="44" width="3.5" height="16" fill="url(#jointShade)" rx="0.8" />
                
                <ellipse cx="127" cy="52" rx="6.5" ry="12" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                <rect x="126.5" y="44" width="3.5" height="16" fill="url(#jointShade)" rx="0.8" />

                {/* Big White Dome Head */}
                <rect x="35" y="15" width="90" height="74" rx="31" ry="31" fill="url(#bodyShade)" stroke="#D4D4D8" strokeWidth="0.5" />
                
                {/* Inner Black Face Screen */}
                <rect x="44.5" y="24" width="71" height="52" rx="18.5" ry="18.5" fill="#0A0A0C" stroke="#27272A" strokeWidth="1.2" />

                {/* Glowing Emerald Green display eyes (pill shapes) */}
                <rect x="58" y="38" width="7.5" height="18" rx="3.75" fill="#10B981" filter="url(#sofiGreenGlow)" />
                <rect x="94.5" y="38" width="7.5" height="18" rx="3.75" fill="#10B981" filter="url(#sofiGreenGlow)" />

                {/* Glowing Emerald Green display smile mouth */}
                <path d="M 70.5 61.5 Q 80 68.5 89.5 61.5" fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" filter="url(#sofiGreenGlow)" />
              </svg>
            </div>
          </div>

          {/* Dialog Bubble: Transparent electric glassmorphism */}
          <div className={`p-5 rounded-[28px] border text-left shadow-lg relative max-w-full animate-fade-in ${
            darkMode 
              ? "bg-[#0A0E1A]/85 border-emerald-500/25 text-zinc-100 shadow-[0_4px_30px_rgba(16,185,129,0.06)]" 
              : "bg-white/80 border-emerald-500/25 text-slate-800 shadow-[0_4px_30px_rgba(16,185,129,0.04)]"
          }`}
               style={{ animationDelay: "150ms" }}>
            
            {/* Bubble arrow */}
            <div className={`absolute top-[-10px] left-[50%] translate-x-[-50%] md:left-[-8px] md:top-14 md:translate-x-0 w-0 h-0 border-8 border-transparent ${
              darkMode 
                ? "border-b-[#0a0e1a] md:border-b-transparent md:border-r-[#0a0e1a]" 
                : "border-b-white md:border-b-transparent md:border-r-white"
            }`} />
            
            <p className="text-sm md:text-[14px] font-medium leading-relaxed">
              {content[lang].greeting}
            </p>
          </div>

          {/* High tech glow badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
            <Sparkles size={11} className="text-emerald-400" />
            <span>Sofi AI Assistant Active</span>
          </div>

        </div>

        {/* Cyber divider line */}
        <div className="hidden md:block w-px h-80 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent self-center mx-2" />

        {/* Column 2: Controls & User Profiling Grid with Unique Accents */}
        <div className="w-full md:w-[50%] flex flex-col space-y-6 text-left">
          
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight italic text-black dark:text-white">
              {content[lang].profileHeading}
            </h2>
            <p className={`text-xs font-medium ${darkMode ? "text-zinc-450" : "text-slate-500"}`}>
              {content[lang].subtitle}
            </p>
          </div>

          {/* Language Selector: segmented glassmorphism */}
          <div className="space-y-2">
            <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
              darkMode ? "text-zinc-500" : "text-slate-400"
            }`}>
              <Globe size={11} className="text-emerald-500" />
              <span>SÉLECTION DE LANGUE</span>
            </label>
            <div className={`flex p-1 rounded-full border max-w-[280px] backdrop-blur-md ${
              darkMode ? "bg-black/50 border-emerald-500/10" : "bg-slate-100 border-slate-200"
            }`}>
              {(["FR", "EN", "ES"] as const).map((l) => {
                const isActive = lang === l;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      if (playNotificationSound) playNotificationSound();
                    }}
                    className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border-none cursor-pointer ${
                      isActive 
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/20" 
                        : "bg-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    {l === "FR" ? "Français" : l === "EN" ? "English" : "Español"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User profiling: responsive flex/grid of 5 glowing glassmorphic pill buttons */}
          <div className="space-y-2.5">
            <label className={`text-[9px] font-black uppercase tracking-widest ${
              darkMode ? "text-zinc-500" : "text-slate-400"
            }`}>
              ROLES DISPONIBLES
            </label>

            {/* Role buttons — GlassRoleButton (design_system_rules.md §2) */}
            <div className="flex flex-col gap-2.5 w-full max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">

              <GlassRoleButton
                colorTheme="cyan"
                label={content[lang].profiles.prospecteur.label}
                description={content[lang].profiles.prospecteur.desc}
                icon={content[lang].profiles.prospecteur.icon}
                onClick={() => handleProfileSelect("prospecteur")}
              />

              <GlassRoleButton
                colorTheme="emerald"
                label={content[lang].profiles.investisseur.label}
                description={content[lang].profiles.investisseur.desc}
                icon={content[lang].profiles.investisseur.icon}
                onClick={() => handleProfileSelect("investisseur")}
              />

              <GlassRoleButton
                colorTheme="amber"
                label={content[lang].profiles.flippeur.label}
                description={content[lang].profiles.flippeur.desc}
                icon={content[lang].profiles.flippeur.icon}
                onClick={() => handleProfileSelect("flippeur")}
              />

              <GlassRoleButton
                colorTheme="indigo"
                label={content[lang].profiles.gestionnaire.label}
                description={content[lang].profiles.gestionnaire.desc}
                icon={content[lang].profiles.gestionnaire.icon}
                onClick={() => handleProfileSelect("gestionnaire")}
              />

              <GlassRoleButton
                colorTheme="purple"
                label={content[lang].profiles.syndicat.label}
                description={content[lang].profiles.syndicat.desc}
                icon={content[lang].profiles.syndicat.icon}
                onClick={() => handleProfileSelect("syndicat")}
              />

            </div>
          </div>

        </div>

      </div>

      {/* Recreated 3D Robot float animation */}
      <style>{`
        @keyframes sofiRobotFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(0.5deg);
          }
        }
        .animate-fade-in {
          animation: onboardingFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes onboardingFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.15);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  );
}
