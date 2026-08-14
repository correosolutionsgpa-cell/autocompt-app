/**
 * i18n.ts — traduction progressive de l'interface AutoCompt.
 *
 * L'app est écrite en français québécois par défaut partout (voir
 * feedback_ui_copy_language en mémoire projet) — ce fichier NE remplace
 * pas cette règle, il ajoute la capacité de traduire à la demande vers
 * l'anglais/espagnol quand un utilisateur choisit ES/EN dans le sélecteur
 * de langue (App.tsx, activeLang).
 *
 * Approche volontairement simple pour une migration incrémentale sur une
 * très grosse base de code déjà écrite en français: la CLÉ du dictionnaire
 * est le texte français lui-même (déjà présent partout dans le code), pas
 * un identifiant abstrait à inventer/maintenir séparément. Tant qu'une
 * chaîne n'a pas encore été ajoutée ici, elle reste simplement affichée en
 * français — jamais d'erreur, jamais de clé manquante visible.
 */

export type Lang = "FR" | "ES" | "EN";

type Entry = { ES: string; EN: string };

const translations: Record<string, Entry> = {
  // ── Navigation — sidebar (App.tsx WorkspaceSidebar) ────────────────────
  "Tableau de Bord": { ES: "Panel de Control", EN: "Dashboard" },
  "Gestion Immobilière": { ES: "Gestión Inmobiliaria", EN: "Property Management" },
  "Meublé / Airbnb": { ES: "Amueblado / Airbnb", EN: "Furnished / Airbnb" },
  "Dossiers Fiscaux": { ES: "Expedientes Fiscales", EN: "Tax Records" },
  "Taxes & Assurances": { ES: "Impuestos y Seguros", EN: "Taxes & Insurance" },
  "Conciliation": { ES: "Conciliación", EN: "Reconciliation" },
  "Tenue de Livres": { ES: "Contabilidad", EN: "Bookkeeping" },
  "Facturation": { ES: "Facturación", EN: "Invoicing" },
  "Bureau Rénov": { ES: "Renovación Oficina", EN: "Home Office Reno" },
  "GPS trajets": { ES: "Trayectos GPS", EN: "GPS Trips" },
  "TPS / TVQ": { ES: "GST / QST", EN: "GST / QST" },
  "DocuLegal": { ES: "DocuLegal", EN: "DocuLegal" },
  "Notre Équipe": { ES: "Nuestro Equipo", EN: "Our Team" },
  "Heures & Paie": { ES: "Horas y Nómina", EN: "Hours & Payroll" },
  "Gestion des Cotisations": { ES: "Gestión de Cuotas", EN: "Assessments Management" },
  "Contrats & Résolutions (DocuLegal)": { ES: "Contratos y Resoluciones (DocuLegal)", EN: "Contracts & Resolutions (DocuLegal)" },
  "Tableau de Transparence": { ES: "Tablero de Transparencia", EN: "Transparency Board" },
  "Loi 16 & Carnet Entretien": { ES: "Ley 16 y Bitácora de Mantenimiento", EN: "Bill 16 & Maintenance Logbook" },
  "Rapport IA (SyndicAI)": { ES: "Informe IA (SyndicAI)", EN: "AI Report (SyndicAI)" },
  "Mur de Communication": { ES: "Muro de Comunicación", EN: "Communication Wall" },
  "Espace Copropriétaire": { ES: "Espacio del Copropietario", EN: "Co-owner Space" },
  "Paramètres": { ES: "Configuración", EN: "Settings" },

  // ── Dashboard — header & toolbar ──────────────────────────────────────
  "Usager": { ES: "Usuario", EN: "User" },
  "PROFIL PLEX": { ES: "PERFIL PLEX", EN: "PLEX PROFILE" },
  "PROFIL SYNDICAT DE COPROPRIÉTÉ": { ES: "PERFIL SINDICATO DE COPROPIEDAD", EN: "CONDO SYNDICATE PROFILE" },
  "Alertes Fiscales": { ES: "Alertas Fiscales", EN: "Tax Alerts" },
  "Régulariser maintenant": { ES: "Regularizar ahora", EN: "Resolve now" },
  "Aller aux paramètres": { ES: "Ir a configuración", EN: "Go to settings" },
  "Plus tard": { ES: "Más tarde", EN: "Later" },
  "Sofi — Assistante IA": { ES: "Sofi — Asistente IA", EN: "Sofi — AI Assistant" },

  // ── Dashboard — barre de recherche ────────────────────────────────────
  "Rechercher une dépense, facture, outil (ex: GPS, taxes, peintre, bail)...": {
    ES: "Buscar un gasto, factura, herramienta (ej: GPS, impuestos, pintor, contrato)...",
    EN: "Search an expense, invoice, tool (e.g.: GPS, taxes, painter, lease)...",
  },
  "Effacer": { ES: "Limpiar", EN: "Clear" },
  "Suggestions et Résultats de recherche": { ES: "Sugerencias y Resultados de búsqueda", EN: "Suggestions and Search Results" },
  "Aucun résultat trouvé pour": { ES: "Ningún resultado encontrado para", EN: "No results found for" },

  // ── Dashboard — scanner IA ─────────────────────────────────────────────
  "SCANNER IA (FACTURES)": { ES: "ESCÁNER IA (FACTURAS)", EN: "AI SCANNER (INVOICES)" },
  "Scans restants": { ES: "Escaneos restantes", EN: "Remaining scans" },

  // ── Dashboard — widget dépenses ───────────────────────────────────────
  "Répartition par catégorie": { ES: "Distribución por categoría", EN: "Breakdown by category" },
  "Répartition des dépenses réelles": { ES: "Distribución de gastos reales", EN: "Real expense breakdown" },
  "Aucune dépense enregistrée": { ES: "Ningún gasto registrado", EN: "No expenses recorded" },
  "Toutes les catégories": { ES: "Todas las categorías", EN: "All categories" },
  "Proportion": { ES: "Proporción", EN: "Proportion" },

  // ── Dashboard — invitations & Drive ───────────────────────────────────
  "Connecter": { ES: "Conectar", EN: "Connect" },
  "Une gestora vous invite à consulter vos relevés de gestion": {
    ES: "Una gestora le invita a consultar sus estados de gestión",
    EN: "A property manager invites you to view your management statements",
  },
  "Cliquez ici pour accepter l'invitation": {
    ES: "Haga clic aquí para aceptar la invitación",
    EN: "Click here to accept the invitation",
  },

  // ── Dashboard — GPS kilométrage ───────────────────────────────────────
  "Kilométrage GPS": { ES: "Kilometraje GPS", EN: "GPS Mileage" },
  "Nouveau trajet client": { ES: "Nuevo trayecto cliente", EN: "New client trip" },

  // ── Tenue de Livres — page header & tabs ──────────────────────────────
  "Rapports Comptable": { ES: "Informes Contables", EN: "Accounting Reports" },
  "Ventes": { ES: "Ventas", EN: "Sales" },
  "Revenus": { ES: "Ingresos", EN: "Revenue" },
  "Dépenses": { ES: "Gastos", EN: "Expenses" },
  "Paie / Personnel": { ES: "Nómina / Personal", EN: "Payroll / Staff" },
  "Banque": { ES: "Banco", EN: "Bank" },
  "Grand Livre": { ES: "Libro Mayor", EN: "General Ledger" },
  "Export Comptable": { ES: "Exportación Contable", EN: "Accounting Export" },
  "Résumé Annuel": { ES: "Resumen Anual", EN: "Annual Summary" },

  // ── Tenue de Livres — espace comptable ────────────────────────────────
  "Profil Comptable": { ES: "Perfil Contable", EN: "Accountant Profile" },
  "Cabinet Comptable Agréé": { ES: "Firma de Contadores Certificados", EN: "Certified Public Accountant Firm" },
  "Modifier mon comptable": { ES: "Modificar mi contador", EN: "Edit my accountant" },
  "Édition active": { ES: "Edición activa", EN: "Active editing" },
  "Nom du Comptable": { ES: "Nombre del Contador", EN: "Accountant Name" },
  "Courriel de contact": { ES: "Correo de contacto", EN: "Contact email" },
  "Téléphone • WhatsApp": { ES: "Teléfono • WhatsApp", EN: "Phone • WhatsApp" },
  "Lien de Dossier Drive personnalisé (Optionnel)": {
    ES: "Enlace de carpeta Drive personalizado (Opcional)",
    EN: "Custom Drive folder link (Optional)",
  },
  "Enregistrer les modifications": { ES: "Guardar cambios", EN: "Save changes" },
  "Annuler": { ES: "Cancelar", EN: "Cancel" },
  "Envoyer par Email": { ES: "Enviar por Correo", EN: "Send by Email" },

  // ── Tenue de Livres — alerte fiscale ──────────────────────────────────
  "⚠️ Échéance fiscale proche : Remise TPS/TVQ trimestrielle (dans 5 jours)": {
    ES: "⚠️ Vencimiento fiscal próximo: Remesa GST/QST trimestral (en 5 días)",
    EN: "⚠️ Upcoming tax deadline: Quarterly GST/QST remittance (in 5 days)",
  },

  // ── Facturation — header & labels ─────────────────────────────────────
  "Configuration de l'émetteur": { ES: "Configuración del emisor", EN: "Issuer configuration" },
  "Identité professionnelle et Séquence": { ES: "Identidad profesional y Secuencia", EN: "Professional identity & Sequence" },
  "Clients": { ES: "Clientes", EN: "Clients" },
  "Envoi de la facture en cours...": { ES: "Enviando la factura...", EN: "Sending invoice..." },
  "✓ Facture envoyée !": { ES: "✓ ¡Factura enviada!", EN: "✓ Invoice sent!" },
  "Échec de l'envoi": { ES: "Error al enviar", EN: "Sending failed" },

  // ── Paramètres / Settings ─────────────────────────────────────────────
  "Configuration": { ES: "Configuración", EN: "Settings" },
  "Sauvegarder": { ES: "Guardar", EN: "Save" },
  "Enregistrer": { ES: "Guardar", EN: "Save" },
  "Fermer": { ES: "Cerrar", EN: "Close" },
  "Fermer le Rapport": { ES: "Cerrar el Informe", EN: "Close Report" },
  "Supprimer": { ES: "Eliminar", EN: "Delete" },
  "Modifier": { ES: "Modificar", EN: "Edit" },
  "Ajouter": { ES: "Agregar", EN: "Add" },
  "Rechercher": { ES: "Buscar", EN: "Search" },
  "Filtrer": { ES: "Filtrar", EN: "Filter" },
  "Exporter": { ES: "Exportar", EN: "Export" },
  "Télécharger": { ES: "Descargar", EN: "Download" },
  "Imprimer": { ES: "Imprimir", EN: "Print" },
  "Partager": { ES: "Compartir", EN: "Share" },
  "Confirmer": { ES: "Confirmar", EN: "Confirm" },
  "Retour": { ES: "Volver", EN: "Back" },

  // ── Gestion Immobilière — module grid labels ───────────────────────────
  "Tenue de livres par immeuble": { ES: "Contabilidad por inmueble", EN: "Building-level bookkeeping" },
  "Mandats de gestion": { ES: "Mandatos de gestión", EN: "Management mandates" },
  "Portefeuille client": { ES: "Cartera de clientes", EN: "Client portfolio" },
  "Relevés de gestion": { ES: "Estados de gestión", EN: "Management statements" },
  "Compte de fidéicommis": { ES: "Cuenta fiduciaria", EN: "Trust account" },
  "Banque & Sync": { ES: "Banco & Sync", EN: "Bank & Sync" },
  "Sous-traitance": { ES: "Subcontratación", EN: "Subcontracting" },

  // ── Profil & Équipe ───────────────────────────────────────────────────
  "Profil & Équipe": { ES: "Perfil & Equipo", EN: "Profile & Team" },
  "Inviter un associé": { ES: "Invitar a un socio", EN: "Invite an associate" },
  "Envoyer l'invitation": { ES: "Enviar la invitación", EN: "Send invitation" },
  "Envoi...": { ES: "Enviando...", EN: "Sending..." },

  // ── Messages communs (erreurs, confirmations) ─────────────────────────
  "Veuillez entrer une adresse courriel.": {
    ES: "Por favor ingrese una dirección de correo.",
    EN: "Please enter an email address.",
  },
  "Erreur lors de l'envoi de l'invitation.": {
    ES: "Error al enviar la invitación.",
    EN: "Error sending the invitation.",
  },
  "Aucune dépense": { ES: "Sin gastos", EN: "No expenses" },
  "Aucune vente": { ES: "Sin ventas", EN: "No sales" },
  "Chargement...": { ES: "Cargando...", EN: "Loading..." },
  "Erreur": { ES: "Error", EN: "Error" },
  "Succès": { ES: "Éxito", EN: "Success" },
  "Connexion en cours...": { ES: "Conectando...", EN: "Connecting..." },
  "Non configuré": { ES: "Sin configurar", EN: "Not configured" },

  // ── Taxes & Assurances ────────────────────────────────────────────────
  "Calculateur taxes TPS / TVQ & déclaration": {
    ES: "Calculadora de impuestos GST/QST y declaración",
    EN: "GST/QST tax calculator & remittance",
  },

  // ── DocuLegal ─────────────────────────────────────────────────────────
  "DocuLegal (Édition et signature de baux & contrats)": {
    ES: "DocuLegal (Edición y firma de contratos y arrendamientos)",
    EN: "DocuLegal (Editing and signing leases & contracts)",
  },
  "Redirection vers les forfaits...": { ES: "Redirigiendo a los planes...", EN: "Redirecting to plans..." },

  // ── Forfaits / Plans ──────────────────────────────────────────────────
  "Choisissez votre forfait": { ES: "Elija su plan", EN: "Choose your plan" },
  "Recommandé": { ES: "Recomendado", EN: "Recommended" },
  "Paiement mensuel": { ES: "Pago mensual", EN: "Monthly payment" },
  "Paiement annuel": { ES: "Pago anual", EN: "Annual payment" },
  "Choisir ce plan": { ES: "Elegir este plan", EN: "Choose this plan" },
  "Appliquer": { ES: "Aplicar", EN: "Apply" },
  "Avez-vous un code promo ?": { ES: "¿Tiene un código de promoción?", EN: "Do you have a promo code?" },

  // ── Notifications & alertes générales ────────────────────────────────
  "dépenses en attente de reçus pour": {
    ES: "gastos pendientes de recibos para",
    EN: "expenses pending receipts for",
  },
  "Annuler le téléversement": { ES: "Cancelar la carga", EN: "Cancel upload" },
  "Synchronisation active": { ES: "Sincronización activa", EN: "Active sync" },
  "Configuration de Google Drive": { ES: "Configuración de Google Drive", EN: "Google Drive setup" },

  // ── PlexModuleGrid — tarjetas de módulos ──────────────────────────────
  "Bureau à domicile": { ES: "Oficina en casa", EN: "Home office" },
  "Déclaration": { ES: "Declaración", EN: "Declaration" },
  "Dossiers": { ES: "Expedientes", EN: "Records" },
  "Fiscaux": { ES: "Fiscales", EN: "Tax" },
  "Heures": { ES: "Horas", EN: "Hours" },
  "Paie": { ES: "Nómina", EN: "Payroll" },
  "Bancaire": { ES: "Bancaria", EN: "Banking" },
  "Gestion": { ES: "Gestión", EN: "Management" },
  "Immobilière": { ES: "Inmobiliaria", EN: "Property" },
  "Taxes": { ES: "Impuestos", EN: "Taxes" },
  "Assurances": { ES: "Seguros", EN: "Insurance" },
  "Compte en": { ES: "Cuenta en", EN: "Account in" },
  "Fidéicommis": { ES: "Fideicomiso", EN: "Trust" },
  "Portefeuille": { ES: "Cartera", EN: "Portfolio" },
  "Assistant IA": { ES: "Asistente IA", EN: "AI Assistant" },
  "Posez vos questions fiscales ou demandez de l'aide en direct !": {
    ES: "¡Haga sus preguntas fiscales o pida ayuda en tiempo real!",
    EN: "Ask your tax questions or get help in real time!",
  },

  // ── Dashboard — textos visibles ───────────────────────────────────────
  "Foto": { ES: "Foto", EN: "Photo" },
  "Galerie": { ES: "Galería", EN: "Gallery" },
  "⚡ Aller à :": { ES: "⚡ Ir a:", EN: "⚡ Go to:" },
  "Assistante IA Sofi": { ES: "Asistente IA Sofi", EN: "AI Assistant Sofi" },
  "CAMÉRA IA VERROUILLÉE - PASSER À BASIQUE": {
    ES: "CÁMARA IA BLOQUEADA - PASAR A BÁSICO",
    EN: "AI CAMERA LOCKED - UPGRADE TO BASIC",
  },

  // ── Menú Perfil y Configuración ────────────────────────────────────────
  "Déconnexion": { ES: "Cerrar sesión", EN: "Log out" },
  "Contactez le support": { ES: "Contactar soporte", EN: "Contact support" },
  "Politique de confidentialité": { ES: "Política de privacidad", EN: "Privacy Policy" },
  "Conditions d'utilisation": { ES: "Términos de servicio", EN: "Terms of Service" },
  "Panneau d'administration": { ES: "Panel de administración", EN: "Admin panel" },
  "Codes Bêta (testeur)": { ES: "Códigos Beta (probador)", EN: "Beta codes (tester)" },

  // ── Acciones comunes ───────────────────────────────────────────────────
  "Ajouter une entreprise": { ES: "Agregar una empresa", EN: "Add a company" },
  "Ajouter / Créer": { ES: "Agregar / Crear", EN: "Add / Create" },
  "Ajouter maintenant": { ES: "Agregar ahora", EN: "Add now" },
  "Chargement des données...": { ES: "Cargando datos...", EN: "Loading data..." },
  "Enregistrer et continuer": { ES: "Guardar y continuar", EN: "Save and continue" },
  "Clôturer l'année 2026": { ES: "Cerrar el año 2026", EN: "Close year 2026" },
  "IMPORTER DOCUMENT": { ES: "IMPORTAR DOCUMENTO", EN: "IMPORT DOCUMENT" },
  "Tout Télécharger (.ZIP)": { ES: "Descargar todo (.ZIP)", EN: "Download all (.ZIP)" },
  "Rappel Important :": { ES: "Recordatorio Importante :", EN: "Important Reminder :" }
};

/** Traduit `frText` vers `lang` — retombe toujours sur le français si la
 *  clé n'existe pas encore ou si `lang === "FR"`. Jamais de clé brute
 *  affichée, jamais d'exception. */
export function tr(lang: Lang, frText: string): string {
  if (lang === "FR" || !frText) return frText;
  return translations[frText]?.[lang] ?? frText;
}
