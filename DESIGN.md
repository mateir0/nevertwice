---
version: "alpha"
name: "PCB Schematic Architecture — Warm Light"
description: "PCB design landing, circuit board style, warm cream solder-mask aesthetic, copper and gold traces, technical precision. Ideal for landing pages, modern websites. AI-ready template."
colors:
  primary: "#F7F1E3"
  secondary: "#3A2E22"
  tertiary: "#D98C53"
  neutral: "#B87333"
  surface: "#FFFDF7"
  accent: "#FFD700"
typography:
  h1:
    fontFamily: Courier New
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: Courier New
    fontSize: 1rem
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface}"
    padding: 12px
---

## Overview

PCB design landing, circuit board style, warm cream solder-mask aesthetic, copper and gold traces, technical precision. Ideal for landing pages, modern websites. AI-ready template. Real circuit boards aren't only green — white and cream solder masks exist, and under them the copper still routes with the same intention. Traces curve, ground planes breathe, components cluster in hierarchies any typographer would recognize — now on warm ivory instead of forest green.

What makes PCB aesthetics so potent in design is their inherent honesty. Every trace exists for a reason. Every via serves a function. There's no decoration — only decisions made visible. On cream, that honesty reads warmer: a lab notebook, a well-kept workbench, competence without the cold.

- Density: 7/10 — Compact
- Variance: 2/10 — Structured
- Motion: 4/10 — Subtle

- **Style:** Technical, Electronic, Structured, Warm
- **Keywords:** PCB, circuit board, cream, copper traces, warm tech, light electronics, solder mask
- **Era:** Modern Electronics
- **Light/Dark:** ✓ Light / ✗ No

## Colors

- **Background** (#F7F1E3) — Primary background surface, warm cream solder mask
- **Surface** (#FFFDF7) — Card surfaces, lighter cream
- **Text** (#3A2E22) — Primary text, dark warm brown
- **Accent** (#D98C53) — Primary accent, CTAs and interactive elements
- **Copper** (#B87333) — Traces, borders, metallic detail
- **Silver** (#C0C0C0) — Extended palette, decorative use
- **Gold** (#FFD700) — Premium accent, highlights, stat numbers
- **Trace Green** (#165B45) — Success states, positive indicators

## Typography

- **Display / Hero:** Courier New — Weight 700, tight tracking, used for headline impact
- **Body:** Courier New — Weight 400, 16px/1.6 line-height, max 72ch per line
- **UI Labels / Captions:** Courier New — 0.875rem, weight 500, slight letter-spacing
- **Monospace:** Courier New — Used for code, metadata, and technical values

Scale:
- Hero: clamp(2.5rem, 5vw, 4rem)
- H1: 2.25rem
- H2: 1.5rem
- Body: 1rem / 1.6
- Small: 0.875rem

## Layout

- **Grid:** CSS Grid primary. Max-width containment: 1280px centered with 1.5rem side padding.
- **Spacing rhythm:** Balanced. Base unit: 0.5rem (8px).
- **Section vertical gaps:** clamp(4rem, 8vw, 8rem).
- **Hero layout:** Split-screen (text left, visual right).
- **Feature sections:** Zig-zag alternating text+image rows. No 3-equal-columns.
- **Mobile collapse:** All multi-column layouts collapse below 768px. No horizontal overflow.
- **z-index contract:** base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).

## Elevation & Depth

Connecting copper traces, solder pads, integrated circuit chip outlines, component nodes, subtle paper-grain warmth.

- **Physics:** Ease-out curves, 200-300ms duration. Smooth and predictable.
- **Entry animations:** Fade + translate-Y (16px → 0) over 420ms ease-out. Staggered cascades for lists: 80ms between items.
- **Hover states:** Subtle color shift + shadow adjustment over 200ms.
- **Page transitions:** Fade only (200ms).
- **Performance:** Only transform and opacity animated. No layout-triggering properties.

## Shapes

Base corner radius: 8px. See rounded tokens in front matter for the full scale.

## Components

- **Primary Button:** Subtly rounded (0.5rem) shape. Warm orange (#D98C53) fill, cream text. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.
- **Secondary / Ghost Button:** Outline variant. 1.5px copper border. Text in dark brown. Hover: subtle cream-dark fill.
- **Cards:** Lighter cream (#FFFDF7) background, subtly rounded (0.5rem) corners. Subtle shadow (0 2px 12px rgba(58,46,34,0.08)). 1px copper border stroke.
- **Inputs:** Label above input. 1px copper border stroke. Focus ring: 2px accent offset 2px. Error text below in warm red-brown. No floating labels.
- **Navigation:** Cream background. Active item: copper indicator. Font weight 500 when active.
- **Skeletons:** Shimmer animation matching component dimensions. No circular spinners.
- **Empty States:** Icon-based composition with descriptive text and action button.

## Do's and Don'ts

- No emojis in UI — use icon system only (Lucide, Heroicons)
- No pure black (#000000) — use warm dark brown variants
- No oversaturated accent colors (saturation cap: 80%)
- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid
- No `h-screen` — use `min-h-[100dvh]`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken external image links — use picsum.photos or inline SVG
- No generic lorem ipsum in demos

- Do cream PCB background
- Do copper traces and borders on cream
- Do chip-like container shapes
- Do electronic component icons
- Do circuit path connectors
- Do dark-brown text on cream — never cream on cream

## Use Case

Landing pages, Modern websites
