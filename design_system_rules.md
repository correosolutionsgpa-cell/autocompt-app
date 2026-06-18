# AutoCompt UI/UX Design System Rules

## 1. Core Aesthetic: Modern Glassmorphism
- The application UI must heavily rely on "Glassmorphism" (translucency, backdrop-blur, and subtle frosted-glass effects) rather than flat solid colors.
- Use multi-layered soft shadows to create a sense of depth and 3D volume, avoiding harsh lines.
- All panels, cards, and modal windows should have a subtle, semi-transparent whitish or grayish border to simulate light reflection on glass.

## 2. Buttons & Interactivity (Premium Feel)
- **Shape:** Buttons must use full-rounded "pill" shapes (e.g., `rounded-full` in Tailwind).
- **Texture:** Apply subtle internal gradients and a slight inner glow.
- **Interactions:** All interactive elements must have smooth transition animations on hover (slight scale up, increased glow, or color shift).

## 3. Color Palette Strategy
- **Base Themes:** 
  - Light mode: Use off-white or soft pearl gradients as backgrounds, avoiding pure #FFFFFF for large areas to let the glass effect pop.
  - Dark mode: Avoid pure flat black (#000000). Use deep charcoal or night-blue translucent tones.
- **Brand Accent:** Use the established AutoCompt neon/bright green exclusively for active states, calls to action, important badges, and subtle glows.

## 4. Typography
- Maintain a clean, modern, sans-serif font structure. Keep weights light or medium for standard text, using bold only for crucial headers or values. Ensure high legibility over the translucent backgrounds.

All future component generation or refactoring must strictly adhere to these principles.
