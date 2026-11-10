---
name: motos-mendes-visual-identity
description: Visual identity guidelines, color palette, design tokens, typography, and UI styling standards for Motos Mendes applications and web catalog.
---

# Motos Mendes Visual Identity & Style Guide

This skill defines the official visual identity, color palette, design tokens, typography, and UI/UX styling rules for all **Motos Mendes S.A.** applications and websites (including `motos-mendes-public`, `App-venta`, and `App-Envios`).

---

## 🎨 Color Palette & Tokens

### Primary Brand Red (Rojo Motos Mendes)
- **Brand Red Primary:** `#e60000` (Main brand color for buttons, active states, key highlights, and primary CTA)
- **Brand Red Dark:** `#cc0000` / `#b30000` (Hover states and active presses)
- **Brand Red Light:** `#ff3333` / `bg-red-50` (Background accents, active menu chips, and subtle badges)
- **Brand Red Border:** `rgba(230, 0, 0, 0.81)` / `border-red-200` (Card hover borders and active element rings)

### Neutrals & Backgrounds
- **Body Background (Light Mode):** `#fafafa` (Zinc-50 / Soft light neutral)
- **Card Background:** `#ffffff` (Clean white cards with crisp borders)
- **Dark Accent / Headers:** `#09090b` (Zinc-950) / `#18181b` (Zinc-900) (Used for dark headers, footers, and floating action bars)
- **Borders & Dividers:** `#e4e4e7` (Zinc-200) / `#f4f4f5` (Zinc-100)

### Typography & Text Colors
- **Primary Text:** `#18181b` (Zinc-900 - High contrast titles and body text)
- **Secondary Text:** `#52525b` (Zinc-600 - Subtitles, metadata, descriptions)
- **Muted Text:** `#71717a` (Zinc-500 / `#94a3b8` - Captions, disabled fields, RUC/code sub-labels)
- **Font Families:** `Outfit` (Headings, titles, badges) & `Inter` / `sans-serif` (UI body, inputs, controls)

---

## 🖼️ Logo & Branding Guidelines

- **Official Logo:** The rounded red square icon with the stylized white mascot head (`logo.png`).
- **Header Branding:**
  - "MOTOS" in bold red (`#e60000`) + "MENDES" in high-contrast text (`#18181b` or `#ffffff` in dark mode).
  - Subtitle: "La Paloma del Espíritu Santo • Canindeyú" or application subtitle ("App-Ventas", "App-Envíos").

---

## ⚡ UI Components & Component Design System

### 1. Header & Glassmorphism
- **Navbar / Header:** Use light frosted glass effect:
  `bg-white/85 backdrop-blur-md border-b border-black/5`
- **Active Navigation Items:**
  - Red color `#e60000` with a subtle bottom line indicator (`h-[2.5px] bg-[#e60000] rounded-full`).
  - Mobile active nav: Bold red text with a left border stripe (`border-l-4 border-l-[#e60000] bg-red-50/30`).

### 2. Product & Feature Cards
- **Structure:** Clean white background (`#ffffff`), rounded corners (`rounded-xl` / `rounded-2xl`), and subtle neutral borders (`border-zinc-200`).
- **Hover Micro-Interactions:**
  - Lift effect: `transform: translateY(-4px)`
  - Soft Red Tint Shadow: `box-shadow: 0 12px 24px rgba(230, 0, 0, 0.08)`
  - Border highlight: `border-color: rgba(230, 0, 0, 0.48)`

### 3. Action Buttons & Controls
- **Primary Buttons:**
  - Background: `#e60000` (`bg-[#e60000]`)
  - Hover: `#cc0000` (`hover:bg-[#cc0000]`)
  - Active: Scale down slightly (`active:scale-95 transition-all duration-200`)
  - Radius: Rounded pill or rounded square (`rounded-xl`)
- **Secondary / Minimal Buttons:**
  - Background: White card with zinc-200 border, dark text, and subtle hover tint.
- **Custom Checkboxes & Sliders:**
  - Active checkboxes: Red background `#e60000` with white check icon.
  - Range sliders: White circular thumb with 4px solid `#e60000` border.

### 4. Badges & Status Indicators
- **Stock / Available Badge:** Soft green (`bg-emerald-50 text-emerald-700 border border-emerald-200`).
- **Brand Accent Badge:** Soft red (`bg-red-50 text-[#e60000] border border-red-200`).
- **Pending / Warning Badge:** Soft amber (`bg-amber-50 text-amber-700 border border-amber-200`).

---

## 📜 Custom Scrollbars & Loading Animations

- **Scrollbar Styling:**
  - Width: `5px` or `6px`
  - Track: Light neutral (`#f4f4f5`)
  - Thumb: Soft gray (`#d4d4d8` / `zinc-300`) with hover state in brand red (`#e60000`)
- **Skeleton Loaders:**
  - Shimmer gradient from `#e4e4e7` to `#f4f4f5` animating infinitely (`animation: shimmer 1.5s infinite`).
