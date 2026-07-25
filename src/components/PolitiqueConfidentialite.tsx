import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2, Mail, ExternalLink, HardDrive, Key, EyeOff } from 'lucide-react';

interface Props {
  onBack?: () => void;
  darkMode?: boolean;
}

export const PolitiqueConfidentialite: React.FC<Props> = ({ onBack, darkMode = true }) => {
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
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6">
          <ShieldCheck size={14} />
          <span>Conformité Loi 25 (Québec) & Google API Security</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
          Politique de confidentialité
        </h1>
        <p className={`text-sm sm:text-base mb-8 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
          Dernière mise à jour : <strong>23 juillet 2026</strong> · Entrée en vigueur immédiate
        </p>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className={`p-5 rounded-2xl border ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <EyeOff size={18} />
            </div>
            <h3 className="font-bold text-sm mb-1">Aucune revente</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AutoCompt ne vend, ne loue et ne partage JAMAIS vos données avec des tiers ou des régies publicitaires.
            </p>
          </div>
          <div className={`p-5 rounded-2xl border ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <HardDrive size={18} />
            </div>
            <h3 className="font-bold text-sm mb-1">Accès Google Drive révocable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Lecture et écriture limitées exclusivement aux dossiers comptables liés. Révocation possible en 1 clic à tout moment.
            </p>
          </div>
          <div className={`p-5 rounded-2xl border ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Lock size={18} />
            </div>
            <h3 className="font-bold text-sm mb-1">Sécurité Firebase & AES-256</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentification sécurisée par Firebase Auth, données chiffrées en transit (TLS) et au repos avec règles Firestore strictes.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className={`space-y-10 text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>

          {/* Intro */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <FileText size={20} />
              1. Engagement global et cadre légal
            </h2>
            <p>
              AutoCompt Inc. (« AutoCompt », « nous », « notre ») s'engage formellement à assurer la confidentialité, l'intégrité et la protection de vos renseignements personnels et documents financiers.
            </p>
            <p>
              La présente politique s'applique à tous les utilisateurs de notre plateforme accessible sur <a href="https://app.autocompt.ca" className="text-emerald-400 underline">https://app.autocompt.ca</a> (incluant les propriétaires d'immeubles, gestionnaires de copropriétés et syndics au Québec). Elle respecte scrupuleusement les exigences de la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> (Loi 25 du Québec) ainsi que la <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE / PIPEDA au Canada).
            </p>
          </section>

          {/* Google Drive Section */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-200"} space-y-4`}>
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <HardDrive size={20} />
              2. Connexion à Google Drive (Intégration OAuth 2.0)
            </h2>
            <p>
              Afin d'offrir l'archivage automatique de vos pièces comptables, factures et feuilles de calcul financières, AutoCompt propose une intégration directe avec votre compte Google Drive.
            </p>

            <div className="space-y-3 pl-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Portées (scopes) d'accès sollicitées :</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400 text-xs">
                    <li><code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300">https://www.googleapis.com/auth/drive.file</code> : autorise AutoCompt à créer, lire et modifier <em>uniquement</em> les fichiers et dossiers créés par l'application ou sélectionnés explicitement par vous.</li>
                    <li><code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300">https://www.googleapis.com/auth/spreadsheets</code> : autorise la mise à jour automatisée de vos feuilles de calcul comptables et rapports fiscaux.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Données lues et finalité exacte :</strong>
                  <p className="mt-0.5 text-xs text-slate-400">
                    AutoCompt lit uniquement les fichiers de factures, reçus d'achats et registres financiers déposés dans le dossier comptable <code>AutoCompt_Reports</code> ou sélectionné dans votre coffre-fort. Ces données sont accédées <strong>exclusivement</strong> pour effectuer la reconnaissance de caractères (OCR), catégoriser vos dépenses (TPS/TVQ, entretien, charges de copropriété) et générer vos états financiers. AutoCompt ne consulte et n'accède à AUCUN autre document personnel de votre Google Drive.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Comment révoquer l'accès à tout moment :</strong>
                  <p className="mt-0.5 text-xs text-slate-400 mb-2">
                    Vous conservez le contrôle absolu sur votre compte Google. Vous pouvez supprimer l'accès d'AutoCompt de deux façons simples et instantanées :
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 font-medium pl-1">
                    <li>Dans AutoCompt : Rendez-vous dans <em>Paramètres &gt; Intégration Google Drive</em> et cliquez sur <strong>« Déconnecter »</strong>.</li>
                    <li>Directement sur Google : Rendez-vous sur <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1">https://myaccount.google.com/permissions <ExternalLink size={12} /></a>, recherchez <strong>AutoCompt</strong> et cliquez sur <strong>« Supprimer l'accès »</strong>. La désautorisation prend effet immédiatement.</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Firebase Section */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Key size={20} />
              3. Authentification et sécurité Firebase (Google Cloud)
            </h2>
            <p>
              Vos accès utilisateur sont sécurisés au moyen de l'infrastructure Google Firebase Authentication et Cloud Firestore.
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
              <li><strong>Gestion des identifiants :</strong> Vos mots de passe ne sont jamais sauvegardés en texte clair. Firebase utilise un hachage cryptographique robuste.</li>
              <li><strong>Isolation des données :</strong> Des règles de sécurité strictes au niveau des bases de données Firestore empêchent tout accès non autorisé entre entreprises ou copropriétés. Seul l'utilisateur dûment authentifié a accès à ses dossiers financiers.</li>
              <li><strong>Chiffrement :</strong> Toutes les communications réseau transitent par un protocole sécurisé HTTPS / TLS 1.3. Vos fichiers sont chiffrés au repos en AES-256.</li>
            </ul>
          </section>

          {/* Financial & Fiscal docs */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <FileText size={20} />
              4. Traitement des documents financiers et fiscaux
            </h2>
            <p>
              AutoCompt traite des données hautement sensibles, incluant :
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 text-xs sm:text-sm">
              <li>Reçus et factures numérisées pour déductions d'immeubles locatifs (Relevé 31, formulaires TP-128 et T776).</li>
              <li>Calculs et registres de déclarations de taxes de vente (TPS et TVQ).</li>
              <li>Études de fonds de prévoyance et carnets d'entretien de syndics de copropriété (Loi 16 du Québec).</li>
              <li>Baux d'habitation, ententes de gestion et livres de société enregistrés via le module DocuLégal.</li>
            </ul>
            <p className="text-xs text-slate-400 mt-2">
              Ces documents sont conservés uniquement pendant la durée nécessaire aux fins prévues et selon les obligations légales de conservation de documents comptables de Revenu Québec et de l'ARC (minimum 6 ans).
            </p>
          </section>

          {/* No Sale Guarantee */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200 shadow-sm"} space-y-3`}>
            <h2 className="text-xl font-extrabold text-emerald-400 flex items-center gap-2">
              <EyeOff size={20} />
              5. Garantie stricte : Aucune revente ni partage de données
            </h2>
            <p className="font-semibold text-slate-100">
              AutoCompt applique une politique de tolérance zéro en matière de commercialisation des données personnelles.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nous ne vendons, ne louons, n'échangeons et ne partageons <strong>JAMAIS</strong> vos données personnelles, financières, fiscales ou comptables avec des tiers, des courtiers en données ou des annonceurs publicitaires. Vos données financières vous appartiennent à 100 %.
            </p>
          </section>

          {/* Quebec Law Rights */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck size={20} />
              6. Vos droits au Québec (Loi 25)
            </h2>
            <p>
              Conformément à la législation québécoise en vigueur, vous bénéficiez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
              <li><strong>Droit d'accès et de rectification :</strong> Vous pouvez consulter et corriger vos informations personnelles directement dans l'application.</li>
              <li><strong>Droit de suppression et d'oubli :</strong> Vous pouvez demander la fermeture définitive de votre compte et l'effacement de l'ensemble de vos dossiers enregistrés sur nos serveurs.</li>
              <li><strong>Droit de portabilité :</strong> Vous pouvez exporter vos données comptables au format Excel/CSV ou PDF à tout moment.</li>
            </ul>
          </section>

          {/* Contact Officer */}
          <section className={`p-6 rounded-2xl border ${darkMode ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"} space-y-3`}>
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Mail size={20} />
              7. Responsable de la vie privée & Contact
            </h2>
            <p className="text-xs sm:text-sm">
              Pour toute question concernant la présente Politique de confidentialité ou pour exercer vos droits relatifs à vos données personnelles :
            </p>
            <div className="space-y-2 pt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Responsable de la protection des renseignements personnels :</strong>
                <span className="text-emerald-400">Équipe Privacy AutoCompt</span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Courriel dédié à la confidentialité :</strong>
                <a href="mailto:confidentialite@autocompt.ca" className="text-emerald-400 underline font-semibold">confidentialite@autocompt.ca</a>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Support général :</strong>
                <a href="mailto:support@autocompt.ca" className="text-emerald-400 underline font-semibold">support@autocompt.ca</a>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-200">Site officiel de l'application :</strong>
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
