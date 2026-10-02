---
version: "alpha"
name: "Steampunk Circuitry"
description: "Victorian steampunk fused with circuit-board engineering: brass traces on parchment, riveted component frames, engraved labels, analog instruments. The GrantQuest soul with electrical guts. AI-ready template."
colors:
  primary: "#F5DEB3"
  secondary: "#5C0000"
  tertiary: "#B5A642"
  neutral: "#B87333"
  surface: "#FFFDF5"
  accent: "#008080"
typography:
  h1:
    fontFamily: IM Fell English
    fontSize: 2.5rem
    fontWeight: 400
  body-md:
    fontFamily: IM Fell English
    fontSize: 1rem
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    padding: 12px
---

## Overview

Victorian steampunk fused with circuit-board engineering. The GrantQuest design soul — parchment, brass, mahogany, IM Fell English — with electrical guts: brass traces routing across the page like an 1890s telegraph exchange, components framed as riveted brass instruments, labels engraved, not printed. The aesthetic of the era when electricity was new and every wire was laid by hand: the Edison lab, the cable station, the analytical engine.

The circuit board here is not a green slab — it is a brass instrument panel. Traces are engraved copper lines with hand-lettered node labels. Components are riveted brass frames holding ivory plates. The weakness graph becomes a switchboard: you reroute current around faults until every line tests clean.

- Density: 7/10 — Rich
- Variance: 5/10 — Ornamented but ordered
- Motion: 4/10 — Deliberate, mechanical

- **Style:** Victorian, Electrical, Ornamented, Technical
- **Keywords:** steampunk, brass, circuits, telegraph, victorian engineering, engraved, rivets, analog instruments
- **Era:** 1880s–1910s electrical age
- **Light/Dark:** ✓ Light / ✗ No

## Colors

- **Parchment** (#F5DEB3) — Primary background, aged paper
- **Ivory** (#FFFDF5) — Card surfaces, plates
- **Mahogany** (#5C0000) — Headings, primary buttons, fault states
- **Brass** (#B5A642) — Traces, frames, premium accents
- **Copper** (#B87333) — Secondary traces, borders, metallic detail
- **Teal** (#008080) — Success states, "tests clean" indicators
- **Ink** (#2A2118) — Body text, engraved labels

## Typography

- **Display / Hero:** IM Fell English — Weight 400. Headlines and wordmark. The soul of the design; never substitute. (Load from Google Fonts.)
- **Body:** IM Fell English — 17px/1.7, max 68ch. Warm, editorial.
- **UI Labels:** IM Fell English SC small caps — 0.875rem, letter-spacing 0.08em.
- **Technical:** JetBrains Mono — ALL circuit readouts, stats, trace labels, metadata, buttons, nav. The electrical voice.

Scale:
- Hero: clamp(2.75rem, 6vw, 4.5rem)
- H1: 2.5rem
- H2: 1.75rem
- Body: 1.0625rem / 1.7
- Small: 0.875rem

## Layout

- **Grid:** CSS Grid primary. Max-width containment: 1280px centered, 1.5rem side padding.
- **Spacing rhythm:** Generous. Base unit: 0.5rem (8px).
- **Section vertical gaps:** clamp(4rem, 8vw, 8rem).
- **Hero layout:** Split-screen (text left, visual right).
- **Feature sections:** Asymmetric bands. No 3-equal-columns.
- **Mobile collapse:** Below 768px. No horizontal overflow.

## Elevation & Depth

Engraved brass traces, riveted plate corners, letterpress ivory, subtle parchment grain, analog dial faces.

- **Physics:** Deliberate mechanical motion — ease-out, 250-350ms. Nothing bouncy.
- **Entry animations:** Fade + rise (12px → 0) over 500ms, staggered 90ms.
- **Hover states:** Brass brightening + 1px lift over 200ms.
- **Performance:** transform/opacity only.

## Shapes

Plates nearly square (4px radius) — Victorian instruments, not app cards. Circular for dials, nodes, rivets.

## Components

- **Primary Button:** Mahogany (#5C0000) fill, parchment text, small-caps, 1px brass inset border. Hover: brighten + lift. Active: press.
- **Secondary / Ghost Button:** 1.5px brass border, mahogany text. Hover: warm fill.
- **Plates (cards):** Ivory (#FFFDF5), 4px radius, 1px brass frame with 4 corner rivets, letterpress shadow.
- **Trace dividers:** Engraved copper lines with node dots and tiny engraved labels.
- **Ledger card:** Ivory plate, riveted brass frame, tilted 2deg. Stats in JetBrains Mono, numbers large mahogany with brass underline.
- **Inputs:** Ivory, 1px copper border. Focus: 2px mahogany ring.
- **Navigation:** Parchment, mahogany text, brass active indicator.
- **Switchboard (heatmap):** Weakness board as a telegraph switchboard — ivory panel, brass terminal nodes per topic, engraved copper traces; fault lines glow mahogany, clean lines show teal.

## Do's and Don'ts

- No emojis — line-style icons only (Lucide/Heroicons)
- No pure black — ink is #2A2118
- No gradients (subtle brass sheen on primary buttons only)
- No 3-equal-column layouts
- No `h-screen` — use min-h-[100dvh]
- No AI clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- Do engraved small-caps labels on traces and frames
- Do rivets on plate corners
- Do tilt the ledger card 2deg
- Do keep circuit traces as COMPONENTS (dividers, switchboard) — never background wallpaper
- Do IM Fell English for editorial text, JetBrains Mono for technical readouts — never swap them

## Use Case

Landing pages, Modern websites
