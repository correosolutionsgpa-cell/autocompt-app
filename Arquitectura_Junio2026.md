# Arquitectura Modular — AutoCompt
### Plano Maestro · Sesión de Desmantelamiento Junio 2026

---

## 1. Resumen Ejecutivo

> **Operación:** Desmantelamiento Modular de `src/App.tsx`  
> **Fecha:** 19 de junio de 2026  
> **Duración:** 1 sesión de trabajo (14 Fases consecutivas)  
> **Resultado:** **−5,517 líneas eliminadas del monolito central (−23.4%)**

### Métricas de Impacto

| Métrica | Antes | Después | Δ |
|---|---|---|---|
| **Líneas en `App.tsx`** | 23,573 | **18,056** | −5,517 |
| **Reducción porcentual** | 100% | 76.6% | **−23.4%** |
| **Módulos extraídos** | 0 | **19 componentes** | +19 |
| **Carpetas de ramas** | 0 | **4 carpetas** | +4 |
| **Errores TypeScript finales** | — | **0** | ✅ |

### Barreras rotas durante la sesión

```
Fase  8 → App.tsx bajó de 20,000 líneas  🎯
Fase 10 → App.tsx bajó de 18,900 líneas  🎯  (-20%)
Fase 11 → App.tsx bajó de 18,363 líneas  🎯  (-22%)
Fase 14 → App.tsx en 18,056 líneas       🎯  (-23.4%)
```

---

## 2. Árbol de Directorios — Arquitectura Modular

```
src/
│
├── App.tsx                          ← Orquestador central (18,056 líneas)
│                                       Dashboard, Context/Estado global, Modales complejos
│
├── ramas-flujo/                     ← 🏗️ NUEVA ARQUITECTURA — Vistas extraídas
│   │
│   ├── MuroTransparencia.tsx        ← F3: Vista de transparencia financiera pública
│   │
│   ├── Rama_Entrepreneurs/          ← 🚀 Rama: Trabajadores Autónomos & Emprendedores
│   │   ├── BureauDomicile.tsx       ← F2: Calculadora de Bureau à Domicile (deducción fiscal)
│   │   └── KilometrageGPS.tsx       ← F2: Registro de Kilómetros con integración GPS
│   │
│   ├── Rama_Gestionnaires/          ← 🏢 Rama: Gestores de Propiedades & Finanzas
│   │   ├── GestionPlex.tsx          ← F5: Gestión de inmuebles Plex (locataires, loyers)
│   │   ├── RapportTaxes.tsx         ← F6: Reporte de Impuestos TPS/TVQ (Revenu Québec)
│   │   ├── RapportComptable.tsx     ← F7: Reporte Contable completo (−1,587 líneas)
│   │   ├── BanqueSyncView.tsx       ← F8: Sincronización Bancaria (Plaid/Open Banking)
│   │   ├── SousTraitanceView.tsx    ← F9: Pagos Sous-traitance & Main-d'œuvre
│   │   ├── HeuresPaieShell.tsx      ← F10: Shell de Suivi Heures & Paie (wrapper)
│   │   ├── SettingsView.tsx         ← F11: Paramètres (Profil entreprise + Admin + UX)
│   │   └── ContratsDLShell.tsx      ← F13: Shell de Contrats & Résolutions (DocuLegal)
│   │
│   └── Rama_Syndicats/             ← 🏘️ Rama: Syndicats de Copropriété (Loi 16)
│       ├── GestionCotisations.tsx   ← F4: Gestión de Cotizaciones de copropietarios
│       ├── MuroCommunication.tsx    ← F4: Muro de Comunicaciones del syndicat
│       ├── ConformiteLoi16.tsx      ← F4: Conformité à la Loi 16 (fonds de prévoyance)
│       └── RapportSyndicAI.tsx      ← F4: Rapport IA del syndicat (análisis automático)
│
└── components/
    │
    ├── modals/                      ← 🪟 NUEVA CARPETA — Modales Presentacionales
    │   ├── ReceiptPreviewModal.tsx  ← F14: Preview de Pièces Justificatives (PDF/imagen)
    │   └── CorporatifModal.tsx      ← F14: Modal informativo Plan Corporatif (límites)
    │
    ├── HeuresPaieView.tsx           ← Componente preexistente (sub-componente de HeuresPaieShell)
    ├── SyndicatDocuLegal.tsx        ← Componente preexistente (sub-componente de ContratsDLShell)
    ├── SuperAdminPanel.tsx          ← Panel de administración del sistema
    └── PlexModuleGrid.tsx           ← Grid de módulos para la vista Plex
```

---

## 3. Función de las 3 Ramas Principales

### 🚀 `Rama_Entrepreneurs/` — Trabajadores Autónomos & Emprendedores

**Audiencia objetivo:** Travailleurs autonomes, freelancers, consultants et entrepreneurs individuels opérant au Québec.

**Responsabilidades:**
- **`KilometrageGPS.tsx`** — Registro y cálculo de kilometraje deducible según la tarifa CRA/ARC (0.70 ¢/km en 2024). Soporta integración GPS para trazado automático de rutas.
- **`BureauDomicile.tsx`** — Calculadora de deducción por Bureau à Domicile conforme al método de superficie (m² bureau / m² total) y método simplifié ($2/jour, max $500). Cumplimiento Revenu Québec.

**Regla fiscal crítica (no modificar):** El cálculo de deducción proporcional (`superficie_bureau / superficie_totale × dépenses_maison`) está auditado por el Tech Lead. No alterar sin aprobación contable.

---

### 🏢 `Rama_Gestionnaires/` — Gestores de Propiedades & Finanzas

**Audiencia objetivo:** Propriétaires immobiliers, gestionnaires de portefeuilles, administrateurs de sociétés et entrepreneurs avec employés.

**Responsabilidades:**
- **`GestionPlex.tsx`** — Gestión completa de inmuebles tipo Plex: locataires, loyers, baux, reçus de loyer mensuels conformes Régie du logement.
- **`RapportTaxes.tsx`** — Generación de reportes de TPS (5%) y TVQ (9.975%) con cálculo automático, exportación y conformidad Revenu Québec.
- **`RapportComptable.tsx`** — Vista de contabilidad completa: libro mayor, balance de gastos, categorización por compte, integración con le comptable assigné.
- **`BanqueSyncView.tsx`** — Sincronización con estados de cuenta bancarios. Importación de transacciones, categorización automática por IA, conciliación.
- **`SousTraitanceView.tsx`** — Gestión de pagos a sous-traitants y main-d'œuvre: formulario de declaración, validación NEQ, cálculo de charges sociales.
- **`HeuresPaieShell.tsx`** — Shell de navegación para la vista de suivi des heures y masse salariale hebdomadaire por employé.
- **`SettingsView.tsx`** — Configuración completa del perfil empresa (NEQ, TPS/TVQ, adresse, logo), perfil administrador y préférences UX (langue, mode sombre, sons).
- **`ContratsDLShell.tsx`** — Shell de navegación para Contrats & Résolutions via el módulo DocuLegal (SyndicatDocuLegal).

**Regla fiscal crítica (no modificar):** Los cálculos de TPS/TVQ (5% / 9.975%) y el seuil de déductibilité ($500 sin factura) son inmutables sin validación contable.

---

### 🏘️ `Rama_Syndicats/` — Syndicats de Copropriété (Loi 16 Québec)

**Audiencia objetivo:** Syndicats de copropriété divise (condominiums), administrateurs d'immeubles et conseils d'administration de syndicats.

**Responsabilidades:**
- **`GestionCotisations.tsx`** — Gestión de cotizaciones de copropietarios: cuotas mensuales, fonds de prévoyance (Loi 16), historique de paiements.
- **`MuroCommunication.tsx`** — Muro de comunicaciones del syndicat: avis, procès-verbaux d'assemblées, communications officielles aux copropriétaires.
- **`ConformiteLoi16.tsx`** — Dashboard de conformité à la Loi 16 (en vigueur 2020): étude de fonds de prévoyance, réserves obligatoires, plan décennal.
- **`RapportSyndicAI.tsx`** — Analyse automatique par IA des dépenses du syndicat: détection d'anomalies, recommandations de gestion, rapport annuel structuré.

**Marco legal aplicable:** Loi modifiant diverses dispositions législatives en matière de copropriété divise (Loi 16, L.Q. 2019, c. 28). Todos los cálculos de réserves y contributions au fonds de prévoyance siguen el barème obligatoire.

---

## 4. Estado Actual de `App.tsx` (18,056 líneas)

`App.tsx` continúa siendo el **orquestador central (SSOT — Single Source of Truth)** de la aplicación. Su contenido actual es:

### ✅ Lo que permanece en `App.tsx` (legítimo e inamovible)

| Sección | Líneas aprox. | Justificación |
|---|---|---|
| **Imports & tipos globales** | ~150 | Punto de entrada único |
| **Estados globales (useState)** | ~800 | SSOT para reactividad cross-componente |
| **Lógica computada (useMemo)** | ~200 | `filteredDepenses`, `filteredHistorique`, `currentCompany` |
| **Efectos (useEffect)** | ~300 | Persistencia localStorage, sync de datos |
| **WorkspaceSidebar** | ~500 | Componente de layout con closures sobre estados globales |
| **Dashboard principal** | ~3,500 | Vista central con KPIs, gráficos, acciones rápidas |
| **Vista de Expenses (depenses)** | ~4,000 | Formularios complejos con validación fiscal integrada |
| **Vista de Factures** | ~2,500 | Generación de facturas con conformidad Revenu Québec |
| **Vistas de Teams/Profile** | ~1,500 | Gestión de équipe e invitaciones |
| **Modales complejos inline** | ~2,000 | PaywallModal, GoogleConnectModal, DuplicateModal, TriplexModal |
| **Shells de vistas simples** | ~500 | Wrappers mínimos hacia componentes externos ya existentes |
| **Clausura final + exports** | ~100 | `return null`, `export default App` |

### ⚙️ Por qué estos bloques permanecen en App.tsx

Los bloques restantes comparten **estado bidireccional denso** con múltiples otras vistas simultáneamente:

- **`filteredDepenses`** y **`filteredHistorique`** son computados en `App.tsx` y consumidos por 8+ vistas diferentes. Extraerlos requeriría introducir Context API o Zustand — una refactorización de Fase 2 que va más allá del desmantelamiento modular.
- **Los modales complejos** (`PaywallModal`, `GoogleConnectModal`) mutan `selectedTier`, `activeProfile`, y otros estados que afectan el comportamiento de toda la app simultáneamente.
- **El Dashboard** requiere acceso en tiempo real a `depenses`, `historique`, `paieRecords`, `listaEmpresas` y `userProfile` para renderizar KPIs agregados.

### 🚧 Candidatos para futuras fases (Fase 15+)

| Candidato | Complejidad | Acción recomendada |
|---|---|---|
| `PaywallModal` (~300 líneas) | Media | Extraer con Context para `selectedTier` |
| `GoogleConnectModal` (~100 líneas) | Baja | Extraer en `src/components/modals/` |
| Dashboard KPI widgets | Alta | Crear `DashboardWidgets.tsx` con props drilling |
| Vista Expenses completa | Muy alta | Requiere Context API — Fase 2 |

---

## 5. Protocolo de Contribución

> **Regla de Oro (mandato de la Tech Lead):**  
> _"Jamás eliminar módulos de UI existentes. Ocultarlos con renderizado condicional basado en el perfil activo, pero nunca remover el código subyacente."_

### Convenciones de naming

- Componentes de vista completa: `[NombreVista]View.tsx`
- Shells de navegación: `[NombreVista]Shell.tsx`
- Modales: `[NombreModal]Modal.tsx`
- Componentes de UI compartidos: `src/components/[Nombre].tsx`

### Flujo de extracción quirúrgico (reproducible)

```
1. Auditar → Identificar dependencias (states, handlers, iconos)
2. Crear   → Componente en carpeta correcta con props tipadas (interface)
3. Cablear → import + reemplazo en App.tsx en una sola operación
4. Limpiar → Eliminar huérfanos con PowerShell (índices inversos)
5. Validar → npx tsc --noEmit (objetivo: 0 errores en primera ronda)
```

---

*Documento generado automáticamente por Antigravity AI — AutoCompt Modular Architecture Report*  
*Sesión: 19 juin 2026 · Tech Lead: Fabiola · Reducción: −23.4% · Módulos: 19*
