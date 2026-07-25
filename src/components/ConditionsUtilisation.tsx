import React from 'react';
import { FileText, ArrowLeft, Shield, Scale, AlertCircle, Mail, ExternalLink, CheckCircle } from 'lucide-react';

interface Props {
  onBack?: () => void;
  darkMode?: boolean;
}

export const ConditionsUtilisation: React.FC<Props> = ({ onBack, darkMode = true }) => {
  return (
    <div className={`min-h-screen ${darkMode ? "bg-black text-slate-100" : "bg-slate-50 text-slate-900"} font-sans transition-colors duration-300`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${darkMode ? "bg-zinc-950/80 border-zinc-800/80" : "bg-white/80 border-slate-200"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-sm font-semibold ${
                  darkMode ? "bg-zinc-900 border-zinc-700 text-slate-200 hover:bg-zinc-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ArrowLeft size={18} />
                <span>Retour</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText size={20} />
              </div>
              <span className="font-extrabold text-lg tracking-tight">AutoCompt</span>
            </div>
          </div>
          <a
            href="https://app.autocompt.ca"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <span>Accéder à l'application</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Banner Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-6">
          <Scale size={14} />
          <span>Contrat d'utilisation · Droit du Québec et du Canada</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
          Conditions d'utilisation
        </h1>
        <p className={`text-sm sm:text-base mb-8 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
          Dernière mise à jour : <strong>23 juillet 2026</strong> · Entrée en vigueur immédiate
        </p>

        {/* Detailed Sections */}
        <div className={`space-y-10 text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <CheckCircle size={20} />
              1. Acceptation des conditions
            </h2>
            <p>
              En créant un compte, en vous connectant ou en utilisant l'application AutoCompt (accessible à l'adresse <a href="https://app.autocompt.ca" className="text-emerald-400 underline">https://app.autocompt.ca</a>), vous acceptez sans réserve d'être lié par les présentes Conditions d'utilisation. Si vous refusez l'une de ces exigences, vous ne devez pas accéder au service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <FileText size={20} />
              2. Description du service
            </h2>
            <p>
              AutoCompt est une plateforme logicielle québécoise de comptabilité automatisée, de gestion immobilière et de rédaction juridique. La plateforme permet notamment :
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 text-xs sm:text-sm">
              <li>La numérisation et l'extraction automatique de pièces justificatives (OCR factures et reçus).</li>
              <li>Le suivi comptable et la génération de rapports de taxes de vente (TPS et TVQ).</li>
              <li>La gestion de copropriétés et la conformité au carnet d'entretien et étude du fonds de prévoyance (Loi 16 du Québec).</li>
              <li>La préparation des formulaires locatifs (Relevé 31, TP-128, T776).</li>
              <li>La génération et signature de documents juridiques via la suite DocuLégal.</li>
              <li>L'archivage sécurisé et la synchronisation avec votre coffre-fort Google Drive.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-amber-950/20 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-200 text-slate-800"} space-y-3`}>
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <AlertCircle size={20} />
              3. Responsabilité comptable et fiscale de l'utilisateur
            </h2>
            <p className="font-medium text-xs sm:text-sm leading-relaxed">
              AutoCompt constitue un outil d'aide à la décision et de gestion comptable automatisée. AutoCompt Inc. n'est pas un cabinet d'experts-comptables (CPA) ni un bureau de conseillers juridiques ou d'avocats.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              L'utilisateur demeure le seul et unique responsable de la vérification des montants extraits, de la conformité des pièces justificatives téléversées et de la soumission finale de ses déclarations de revenus ou de taxes auprès de <strong>Revenu Québec</strong> et de l'<strong>Agence du revenu du Canada (ARC)</strong>. L'utilisateur est vivement encouragé à valider ses rapports auprès d'un professionnel qualifié (CPA, fiscaliste ou notaire) si nécessaire.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Shield size={20} />
              4. Compte, sécurité et intégrations tierces
            </h2>
            <p>
              Vous êtes responsable du maintien de la confidentialité de vos identifiants de connexion (compte Firebase) et des accès autorisés à votre Google Drive. Vous vous engagez à aviser immédiatement AutoCompt de toute utilisation non autorisée de votre compte à <a href="mailto:support@autocompt.ca" className="text-emerald-400 underline">support@autocompt.ca</a>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Scale size={20} />
              5. Propriété intellectuelle
            </h2>
            <p>
              Tous les éléments composants l'application AutoCompt (interfaces visuelles, code source, marques de commerce, logos, l'assistant virtuel Sofi AI et modules DocuLégal) sont la propriété exclusive d'AutoCompt Inc. Toute reproduction, copie ou diffusion non autorisée est strictement interdite.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <FileText size={20} />
              6. Tarification, abonnements et résiliation
            </h2>
            <p>
              Les tarifs des abonnements AutoCompt sont indiqués en dollars canadiens (CAD) et sont sujet aux taxes applicables (TPS/TVQ). Vous pouvez annuler votre abonnement ou fermer votre compte à tout moment depuis le menu <em>Paramètres</em> de l'application. Vos données restent téléchargeables pendant une période de 30 jours suivant l'annulation.
            </p>
          </section>

          {/* Section 7 */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200 shadow-sm"} space-y-3`}>
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Scale size={20} />
              7. Droit applicable et juridiction (Québec)
            </h2>
            <p className="text-xs sm:text-sm">
              Les présentes Conditions d'utilisation sont régies, interprétées et appliquées conformément aux lois de la province de Québec et aux lois fédérales du Canada qui s'y appliquent. Tout litige relatif à la validité, à l'interprétation ou à l'exécution du présent contrat sera soumis à la compétence exclusive des tribunaux du district judiciaire de <strong>Montréal (Québec)</strong>.
            </p>
          </section>

          {/* Section 8 */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-blue-950/20 border-blue-500/30" : "bg-blue-50 border-blue-200"} space-y-3`}>
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Mail size={20} />
              8. Contact
            </h2>
            <p className="text-xs sm:text-sm">
              Pour toute question relative aux présentes Conditions d'utilisation :
            </p>
            <div className="space-y-2 pt-1 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Support client & questions légales :</strong>
                <a href="mailto:support@autocompt.ca" className="text-emerald-400 underline font-semibold">support@autocompt.ca</a>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Site officiel :</strong>
                <a href="https://app.autocompt.ca" className="text-emerald-400 underline font-semibold">https://app.autocompt.ca</a>
              </div>
            </div>
          </section>

        </div>

        {/* Bottom Back Button */}
        {onBack && (
          <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-center">
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-slate-200 font-bold text-sm transition-all flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Retourner à l'application AutoCompt</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
