---
version: "alpha"
name: "PCB Schematic Architecture"
description: "PCB design landing, circuit board style, electronics aesthetic, green and copper palette, connecting traces, chip outlines, technical precision. Ideal for landing pages, modern websites. AI-ready template."
colors:
  primary: "#0F3B2C"
  secondary: "#EAD0AC"
  tertiary: "#D98C53"
  neutral: "#B87333"
  surface: "#C0C0C0"
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
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    padding: 12px
---

## Overview

PCB design landing, circuit board style, electronics aesthetic, green and copper palette, connecting traces, chip outlines, technical precision. Ideal for landing pages, modern websites. AI-ready template. PCB layout was never meant to be beautiful. It was meant to work — to route power from point A to point B without interference, without crosstalk, without failure. And yet. Look at a well-designed board under magnification and tell me that's not composition. The traces curve with intention. The ground planes breathe. Components cluster in hierarchies that any typographer would recognize.

The circuit board entered visual culture through teardown photography and transparent device casings in the late '90s. Suddenly the guts were the aesthetic. Apple's original iMac made internals visible; hardware startups started printing logos on their PCBs because they knew someone would photograph them. The board became a canvas that happened to also conduct electricity.

What makes PCB aesthetics so potent in design is their inherent honesty. Every trace exists for a reason. Every via serves a function. There's no decoration — only decisions made visible. That's a rare quality in visual language, and it's why circuit board motifs communicate competence instantly. You can't fake the complexity of a real routing job.

- Density: 7/10 — Compact
- Variance: 2/10 — Structured
- Motion: 4/10 — Subtle

- **Style:** Technical, Electronic, Structured
- **Keywords:** PCB, circuit board, electronic, copper, traces, soldering, green board, chip, tech
- **Era:** Modern Electronics
- **Light/Dark:** ✗ No / ✓ Full

## Colors

- **Background** (#0F3B2C) — Primary background surface
- **Text** (#EAD0AC) — Primary text color
- **Accent** (#D98C53) — Primary accent, CTAs and interactive elements
- **Copper** (#B87333) — Metallic accent, decorative detail
- **Silver** (#C0C0C0) — Extended palette, decorative use
- **Gold** (#FFD700) — Premium accent, decorative highlights
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

Connecting copper traces, solder pads, integrated circuit chip outlines, component nodes, matte FR-4 texture.

- **Physics:** Ease-out curves, 200-300ms duration. Smooth and predictable.
- **Entry animations:** Fade + translate-Y (16px → 0) over 420ms ease-out. Staggered cascades for lists: 80ms between items.
- **Hover states:** Subtle color shift + shadow adjustment over 200ms.
- **Page transitions:** Fade only (200ms).
- **Performance:** Only transform and opacity animated. No layout-triggering properties.


## Shapes

Base corner radius: 8px. See rounded tokens in front matter for the full scale.


## Components

- **Primary Button:** Subtly rounded (0.5rem) shape. Accent color fill. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.
- **Secondary / Ghost Button:** Outline variant. 1.5px border in muted color. Text in primary color. Hover: subtle background fill.
- **Cards:** Subtly rounded (0.5rem) corners. Surface background. Subtle shadow (0 2px 12px rgba(0,0,0,0.06)). 1px border stroke.
- **Inputs:** Label above input. 1px border stroke. Focus ring: 2px accent color offset 2px. Error text below in semantic red. No floating labels.
- **Navigation:** Primary surface background. Active item: accent color indicator. Font weight 500 when active.
- **Skeletons:** Shimmer animation matching component dimensions. No circular spinners.
- **Empty States:** Icon-based composition with descriptive text and action button.


## Do's and Don'ts

- No emojis in UI — use icon system only (Lucide, Heroicons)
- No pure black (#000000) — use off-black or charcoal variants
- No oversaturated accent colors (saturation cap: 80%)
- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid
- No `h-screen` — use `min-h-[100dvh]`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken external image links — use picsum.photos or inline SVG
- No generic lorem ipsum in demos

- Do Green PCB background
- Do Copper colored borders/traces
- Do Chip-like container shapes
- Do Electronic component icons
- Do Circuit path connectors


## Use Case

Landing pages, Modern websites
