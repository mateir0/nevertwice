---
version: "alpha"
name: "The Dossier"
description: "Dark Soviet-archival visual system for NEVERTWICE. Near-black canvas, parchment type, Soviet red, bronze. Poster headlines, typewriter body, rubber stamps, film grain. The vibe of a declassified case file — serious, cinematic, relentless."
---

## Overview

NEVERTWICE is not an adventure — it is a reckoning. A brother missed NUST. This is the machine that makes sure he never loses the same mark twice. The design treats every session like a case file: dark, serious, cinematic, with the gravity of a declassified dossier. No ornament for ornament's sake. Every element earns its place.

Reference: thesovietflip.com — dark archival, trilingual typewriter labels, bronze pill buttons, red star, film grain.

- Density: 6/10 — Rich but disciplined
- Variance: 6/10 — Expressive
- Motion: 4/10 — Deliberate

- **Style:** Archival, Cinematic, Relentless
- **Keywords:** dossier, soviet, archive, typewriter, red star, declassified, war room
- **Light/Dark:** ✓ Dark / ✗ No

## Colors

- **Night** (#0B0906) — Page canvas, near-black warm
- **Panel** (#14110B) — Card surfaces
- **Parchment** (#E8DCC0) — Primary text
- **Faded** (#9A8A6B) — Muted text, secondary labels
- **Blood** (#B3202C) — Soviet red: CTAs, faults, stars, stamps
- **Blood Deep** (#7C1420) — Deep red borders
- **Bronze** (#A67C3D) — Borders, metallic detail, dividers
- **Amber** (#D9A441) — Highlights, warnings, key numbers
- **Olive** (#6B7F4E) — Clean / verified states

## Typography

- **Display:** Russo One (Google Fonts) — headlines, wordmark, key numbers. Soviet poster voice. Weight 400 only.
- **Body/Labels/Buttons:** Courier Prime (Google Fonts) — typewriter. Body 16px/1.7, labels uppercase 0.8rem/0.22em letterspacing, buttons bold uppercase 0.12em.
- Never use serif here. The typewriter IS the voice.

Scale:
- Hero: clamp(2.6rem, 10vw, 4.6rem), line-height 1
- H2: 1.5rem Russo One, 0.06em tracking
- Body: 1rem/1.7 Courier Prime
- Small: 0.8rem

## Layout

- Max-width 5xl (64rem) centered, 1rem–2rem side padding.
- Hero: split two columns on desktop (1.15fr / 1fr), stacks on mobile.
- Right column holds exactly ONE tilted object: the CASE FILE card (rotate-2).
- Sections separated by FIG dividers: bronze rule + diamond nodes + typewriter label.
- Mobile 390px: everything stacks, headline scales, no horizontal overflow.

## Texture & Atmosphere

- Film grain: fixed SVG-noise overlay, 5.5% opacity, pointer-events none.
- Vignette: fixed radial gradient darkening edges.
- Hero background: giant faded star watermark (bronze, 5% opacity) + faint bronze schematic traces (10% opacity). Never behind text at full strength.
- Rubber stamps: rotated bordered labels (e.g. ACTIVE) with grunge mask.

## Components

- **Primary Button:** blood-red pill, parchment bold typewriter text, bronze inner line, red glow shadow. Hover: brighten + lift.
- **Secondary Button:** transparent pill, 1px bronze border, bronze text. Hover: amber border, parchment text.
- **Cards:** panel bg, 1px bronze border, 4px radius, deep black shadow + faint top highlight.
- **Navbar:** sticky, near-black, 1px bronze bottom border. Red star + Russo One wordmark, typewriter nav, amber REC indicator, red pill BEGIN.
- **Case File:** tilted dark card, bronze border, ACTIVE rubber stamp, amber Russo One stats.
- **Threat Board:** fault = blood red, watch = bronze, clean = olive. Red glow on hot faults.
- **Dividers:** bronze hairline, diamond nodes, `FIG. I — LABEL` typewriter tag.
- **Footer:** star medallion (bronze ring, red star), Russo One wordmark, typewriter tagline, right-aligned "A Hashir original."

## Do's and Don'ts

- No emojis — Lucide icons only. The red star (Lucide Star, filled) is the signature mark.
- No pure black text on dark — parchment/faded only.
- No light surfaces — everything lives on night/panel.
- No gradients except subtle button sheen and vignette.
- Copy voice: dossier terse. "BOARD UNPOPULATED." "CLASSIFY THE ERROR TO CONTINUE." Short. Cold. Honest.
- No invented data — empty states stay honest.
