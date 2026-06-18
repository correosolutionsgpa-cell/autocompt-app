# AutoCompt — Global Design System Rules
> **Version 2.0** — Futuristic Dashboard + Physical 3D Glass
> All components, screens, and refactoring must strictly adhere to these rules. No exceptions.

---

## 1. Background & Layout (Futuristic Dashboard Aesthetic)

The overall application surfaces must feel like a premium financial dashboard — clean, minimal, and breathable. Colors live inside the glass, not on the walls.

### Light Mode
```
Background canvas:  bg-[#F0F4F8]  (soft blue-grey, NOT pure white)
Page glow accents:  bg-emerald-400/5 and bg-cyan-400/5 as blurred radials (blur-[140px])
Card/panel base:    bg-white/60 backdrop-blur-xl border border-white/70
Sidebar/nav:        bg-white/80 backdrop-blur-md border-r border-slate-200/60
Text primary:       text-slate-800
Text secondary:     text-slate-500
```

### Dark Mode — "Living Light" Cyber-Glass

> **Core rule:** Every dark surface must feel like illuminated glass floating in deep space — never a flat painted wall.

#### Canvas
```
Background:         bg-slate-950  (#0B1120 — rich bluish-grey, NEVER pure black)
Ambient glow 1:     absolute inset blurred radial, bg-emerald-500/[0.06] blur-[180px] (top-left)
Ambient glow 2:     absolute inset blurred radial, bg-indigo-500/[0.06]  blur-[180px] (bottom-right)
Ambient glow 3:     absolute inset blurred radial, bg-cyan-500/[0.04]    blur-[200px] (center — hero area only)
```

#### Cards & Panels (Physical Presence)
```
Card base:          bg-white/[0.04] backdrop-blur-xl
Card border:        border border-white/[0.08]                            ← NOT a hard 1px solid
Card inner edge:    box-shadow: inset 0 1px 1px rgba(255,255,255,0.06)    ← subtle top glass reflection
Card drop shadow:   shadow-[0_8px_32px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)]
Active/selected:    border-[COLOR]/30, shadow-[0_0_20px_rgba(R,G,B,0.15)] ← static glow, no pulse
```

#### Sidebar / Navigation
```
Background:         bg-white/[0.03] backdrop-blur-md
Border:             border-r border-white/[0.07]
Active nav item:    bg-[COLOR]/10 border-l-2 border-[COLOR]/60 text-[COLOR]-300
```

#### Text
```
Primary:            text-zinc-100
Secondary:          text-zinc-400
Muted/label:        text-zinc-600  (uppercase micro-labels)
On glass overlay:   text-white/80
```

#### Gradients & Glow — "Living Light" Rules
All colored elements in dark mode must emit light, not just display color.

```
Gradient buttons:   bg-gradient-to-br from-[COLOR]/20 to-[COLOR]/5
Glow (static):      shadow-[0_0_20px_rgba(R,G,B,0.15)]       ← all secondary modules
Glow (hover):       shadow-[0_0_32px_rgba(R,G,B,0.30)]       ← interactive elements on :hover
Glow (hero pulse):  See §6 — restricted to primary AI hero element only
```

> ❌ NEVER use `border border-white/10` alone on large panels — always pair with the card inner shadow.
> ❌ NEVER use a flat `#1e1e1e` or `#111111` background — use `bg-slate-950` exclusively.
> ✅ ALWAYS layer at least two ambient glow radials behind the content canvas.

### Layout Rules
- Grid system: `gap-4 md:gap-6` — breathable spacing, never tight
- Corner radius for cards/panels: `rounded-2xl` or `rounded-3xl`
- Section dividers: gradient lines (`bg-gradient-to-r from-transparent via-slate-200/40 to-transparent`), never hard borders
- No solid color backgrounds on large surfaces — always semi-transparent + blur

---

## 2. The 3D Glass Button Standard (MANDATORY for ALL Interactive Elements)

Every button, card selection, toggle, and clickable tile must use this physical 3D glass structure. Reference: the glass button anatomy diagram with specular highlights, blurred effect, soft shadows, and inner glow.

### The Glass Anatomy (Required Layers)
1. **Increased Transparency** — base fill is near-invisible colored glass, NOT an opaque block
2. **Specular Highlight** — `inset_0_1px_1px_rgba(255,255,255,0.6)` creates the bright top physical edge
3. **Blurred Effect** — `backdrop-blur-md` distorts content behind the glass
4. **Soft Drop Shadow** — outer shadow anchors the button physically to the surface
5. **Inner Glow** — on hover, a colored inset shadow activates, like a light turning on inside
6. **Glossy Border** — `border border-[COLOR]/50` defines the colored glass edge

### Resting State (Clear Glass with Colored Edge)
```tailwind
relative overflow-hidden rounded-2xl
backdrop-blur-md
bg-white/20 dark:bg-white/5
border border-[PROFILE_COLOR]/50
shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]
dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]
transition-all duration-300
```

### Hover State (Internal Light Glow — NOT a Solid Color)
```tailwind
hover:bg-[PROFILE_COLOR]/15
dark:hover:bg-[PROFILE_COLOR]/20
hover:border-[PROFILE_COLOR]/80
hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_0_30px_rgba(R,G,B,0.3),0_0_20px_rgba(R,G,B,0.2)]
dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_0_30px_rgba(R,G,B,0.3),0_0_20px_rgba(R,G,B,0.2)]
```
> **Rule:** Replace `[PROFILE_COLOR]` and `rgba(R,G,B,...)` with the specific profile color for that element. The shadow must use exact RGB values matching the color token (not a generic white or black).

### Profile Color Tokens (for buttons and tinted glass)
| Profile       | Tailwind Token  | Shadow RGB            |
|---------------|-----------------|-----------------------|
| Prospecteur   | `cyan-500`      | `rgba(6,182,212,...)`   |
| Investisseur  | `emerald-500`   | `rgba(16,185,129,...)`  |
| Flippeur      | `amber-500`     | `rgba(245,158,11,...)`  |
| Gestionnaire  | `indigo-500`    | `rgba(99,102,241,...)`  |
| Syndicat      | `purple-500`    | `rgba(139,92,246,...)`  |
| Brand Primary | `emerald-500`   | `rgba(16,185,129,...)`  |

### Strict Rules for All Buttons
- ❌ **NEVER** use a solid background color (e.g., `bg-emerald-500`) — the glass must always be translucent
- ❌ **NEVER** animate icons with scale, rotate, or translate on hover — contents must be static
- ✅ **ALWAYS** include the `inset_0_1px_1px` top reflection shadow in both rest and hover states
- ✅ **ALWAYS** use `backdrop-blur-md` or `backdrop-blur-xl` on glass containers
- ✅ The colored glow (`inset_0_0_30px`) only appears on `:hover` — the resting state is clear glass

---

## 3. Color Philosophy — Glass-First

> **Core Rule: Color lives INSIDE the glass as a tint or glow, never as a solid wall.**

- **Backgrounds:** Neutral, near-transparent (white/5 to white/20)
- **Borders:** Carry the role color at low opacity (`/30` to `/50`) at rest, `(/80)` on hover
- **Glows:** Colored light emits inward on hover via inset box-shadow
- **Text:** Static color from the profile palette (e.g., `text-emerald-600 dark:text-emerald-400`)
- **Brand accent (AutoCompt green):** Reserved exclusively for:
  - Active navigation states
  - Primary CTA buttons
  - Status badges and confirmation indicators
  - Subtle decorative glows on card corners

---

## 4. Cards & Panels

Cards follow the same glass anatomy as buttons, but without the colored border by default.

```tailwind
/* Standard Card */
rounded-2xl md:rounded-3xl
bg-white/60 dark:bg-white/[0.04]
backdrop-blur-xl
border border-white/70 dark:border-white/10
shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]
```

On cards that represent a selected or active state, apply the profile color border at `/40` opacity.

---

## 5. Typography

- **Font:** System sans-serif stack, or `Inter` from Google Fonts if loaded
- **Hierarchy:**
  - Page title / H1: `text-2xl md:text-3xl font-extrabold uppercase tracking-tight`
  - Section heading: `text-lg font-bold`
  - Label / caption: `text-[10px] font-black uppercase tracking-widest` (all caps micro labels)
  - Body / description: `text-sm font-normal leading-relaxed`
- **Over glass surfaces:** Always ensure sufficient contrast. Use `text-slate-800` (light) and `text-zinc-100` (dark) as base. Drop shadows on text are **not** used — increase background opacity instead.

---

## 6. Motion & Animation

- Transitions on buttons: `transition-all duration-300` — no longer than 300ms for interactive feedback
- Page/card entrance: `opacity-0 → opacity-100` + `translateY(12px) → translateY(0)` over `600–800ms`
- Floating elements (e.g., avatar, robot): `translateY` sine wave animation, `6s ease-in-out infinite`
- ❌ **No bounce, spin, or scale on icon hover** — only the container glass may change (bg, shadow, border)
- ❌ **No heavy CSS animations** on large surfaces — blur effects are already performance-intensive

### Selective Breathing Pulse — Strict Usage Policy

A slow, organic "breathing" animation may exist in the codebase but **MUST be gated** by role:

| Element type | Animation allowed |
|---|---|
| Primary AI hero (Scanner, Sofi avatar, main CTA) | ✅ Breathing pulse — opacity + scale |
| Active status badge / live indicator dot | ✅ Pulse — opacity only, `1.5s ease-in-out infinite` |
| Secondary cards, role buttons, nav items | ❌ **Static** — use a fixed glow shadow instead |
| Data panels, metric tiles, table rows | ❌ **No animation whatsoever** |

**Keyframe definition (add once to global CSS):**
```css
@keyframes livingPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 20px rgba(var(--pulse-rgb), 0.15);
  }
  50% {
    opacity: 0.82;
    transform: scale(1.012);
    box-shadow: 0 0 40px rgba(var(--pulse-rgb), 0.30);
  }
}
.animate-living-pulse {
  animation: livingPulse 4s ease-in-out infinite;
}
```
> Set `--pulse-rgb` as an inline CSS variable on the element (e.g., `style="--pulse-rgb: 16,185,129"`)
> **Maximum one `.animate-living-pulse` element visible at a time per screen.**

---

## 7. Iconography

- Library: `lucide-react` exclusively
- Icon size in buttons: `w-5 h-5`
- Icon size in nav/labels: `w-4 h-4`
- Icon containers (circular badge): `w-9 h-9 rounded-full` with `bg-[PROFILE_COLOR]/10` and `text-[PROFILE_COLOR]-600 dark:text-[PROFILE_COLOR]-400`
- Icons must NOT animate individually — they are static inside animated containers

---

*All future component generation, refactoring, or AI-assisted code changes must reference and strictly follow this document. When in doubt, re-read Section 2 (The 3D Glass Button Standard).*
