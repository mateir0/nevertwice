\---

version: "alpha"

name: "Cassette Futurism"

description: "Cassette futurism landing page. Ideal for landing pages, saas. AI-ready template."

colors:

&#x20; primary: "#33FF00"

&#x20; secondary: "#D2B48C"

&#x20; tertiary: "#333333"

&#x20; neutral: "#FFB000"

&#x20; surface: "#CC0000"

&#x20; accent: "#999999"

typography:

&#x20; h1:

&#x20;   fontFamily: VT323

&#x20;   fontSize: 2.5rem

&#x20;   fontWeight: 700

&#x20; body-md:

&#x20;   fontFamily: JetBrains Mono

&#x20;   fontSize: 1rem

&#x20;   fontWeight: 400

spacing:

&#x20; sm: 4.0px

&#x20; md: 8.0px

&#x20; lg: 16.0px

components:

&#x20; button-primary:

&#x20;   backgroundColor: "{colors.primary}"

&#x20;   textColor: "{colors.neutral}"

&#x20;   padding: 12px

\---



\## Overview



Cassette futurism landing page. Ideal for landing pages, saas. AI-ready template. Before touchscreens flattened everything, the future looked physical. Ridley Scott's Alien gave us interfaces you could punch — toggle switches, amber phosphor displays, keyboards with travel. Kubrick's 2001 had screens embedded in padded walls like instruments in a cockpit. The future wasn't sleek. It was engineered.



Cassette futurism lives in that gap between what designers in the 1970s and 80s imagined tomorrow would look like and what actually arrived. It's the aesthetic of futures that never happened — where data still lived on magnetic tape, where monitors had scan lines, where you heard the machine thinking. The appeal is tactile. Every interaction had weight, friction, consequence.



This became a deliberate design language around 2015, when indie game developers and digital artists started mining that visual vocabulary — not out of laziness, but because those chunky bezels and blinking LEDs communicate something flat design never could: that technology is a thing you operate, not a surface you passively consume.



\- Density: 5/10 — Balanced

\- Variance: 7/10 — Dynamic

\- Motion: 6/10 — Expressive



\- \*\*Style:\*\* Retro-Futuristic, Analog-Digital, Nostalgic

\- \*\*Keywords:\*\* cassette futurism, retro-futuristic, analog, CRT, scanlines, VHS, tape deck, lo-fi, 80s tech, command line

\- \*\*Era:\*\* 1970s-1980s Retrofuture

\- \*\*Light/Dark:\*\* ✗ No / ✓ Full



\## Colors



\- \*\*CRT Green\*\* (#33FF00) — Primary surface or dominant color

\- \*\*Warm Beige\*\* (#D2B48C) — Secondary surface or text color

\- \*\*Charcoal\*\* (#333333) — Dark surface, primary background

\- \*\*Phosphor Amber\*\* (#FFB000) — Warning states, attention indicators

\- \*\*Tape Red\*\* (#CC0000) — Error states, destructive actions

\- \*\*Static Grey\*\* (#999999) — Secondary text, borders, muted elements

\- \*\*Deep Navy\*\* (#1B2838) — Extended palette, decorative use

\- \*\*Off-White\*\* (#E8E0D0) — Secondary surface





\## Typography



\- \*\*Display / Hero:\*\* VT323 — Weight 700, tight tracking, used for headline impact. Display only.

\- \*\*Body / Question text:\*\* JetBrains Mono — Weight 400, 16px/1.6 line-height, max 72ch per line. All sustained reading uses JetBrains Mono — VT323 pixel type causes eye fatigue in long study sessions and must never be used for body copy, questions, or explanations.

\- \*\*UI Labels / Captions:\*\* VT323 — 0.875rem, weight 500, slight letter-spacing

\- \*\*Monospace:\*\* JetBrains Mono — Used for body text, question text, code, metadata, and technical values



Scale:

\- Hero: clamp(2.5rem, 5vw, 4rem)

\- H1: 2.25rem

\- H2: 1.5rem

\- Body: 1rem / 1.6

\- Small: 0.875rem





\## Layout



\- \*\*Grid:\*\* CSS Grid primary. Max-width containment: 1280px centered with 1.5rem side padding.

\- \*\*Spacing rhythm:\*\* Balanced. Base unit: 0.5rem (8px).

\- \*\*Section vertical gaps:\*\* clamp(4rem, 8vw, 8rem).

\- \*\*Hero layout:\*\* Asymmetric composition.

\- \*\*Feature sections:\*\* Asymmetric grid with varied card sizes. No 3-equal-columns.

\- \*\*Mobile collapse:\*\* All multi-column layouts collapse below 768px. No horizontal overflow.

\- \*\*z-index contract:\*\* base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).





\## Elevation \& Depth



CRT scanline overlay, VHS tracking distortion, phosphor glow, chunky pixel borders, tape reel animations, analog meter gauges, command-line text effects, LED dot matrix displays



\- \*\*Physics:\*\* Spring — stiffness 120, damping 20. Confident, weighted transitions.

\- \*\*Entry animations:\*\* Fade + translate-Y (16px → 0) over 480ms ease-out. Staggered cascades for lists: 100ms between items.

\- \*\*Hover states:\*\* Scale(1.03) + shadow lift over 200ms.

\- \*\*Page transitions:\*\* Fade + slide (300ms).

\- \*\*Performance:\*\* Only transform and opacity animated. No layout-triggering properties.





\## Shapes



Base corner radius: 8px. See rounded tokens in front matter for the full scale.





\## Components



\- \*\*Primary Button:\*\* Subtly rounded (0.5rem) shape. Accent color fill. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.

\- \*\*Secondary / Ghost Button:\*\* Outline variant. 1.5px border in muted color. Text in primary color. Hover: subtle background fill.

\- \*\*Cards:\*\* Subtly rounded (0.5rem) corners. Surface background. Subtle shadow (0 2px 12px rgba(0,0,0,0.06)). 1px border stroke.

\- \*\*Inputs:\*\* Label above input. 1px border stroke. Focus ring: 2px accent color offset 2px. Error text below in semantic red. No floating labels.

\- \*\*Navigation:\*\* Primary surface background. Active item: accent color indicator. Font weight 500 when active.

\- \*\*Skeletons:\*\* Shimmer animation matching component dimensions. No circular spinners.

\- \*\*Empty States:\*\* Icon-based composition with descriptive text and action button.





\## Do's and Don'ts



\- No emojis in UI — use icon system only (Lucide, Heroicons)

\- No pure black (#000000) — use off-black or charcoal variants

\- No oversaturated accent colors (saturation cap: 80%)

\- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid

\- No `h-screen` — use `min-h-\[100dvh]`

\- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"

\- No broken external image links — use picsum.photos or inline SVG

\- No generic lorem ipsum in demos

\- Do use JetBrains Mono for all sustained reading (questions, explanations, body copy); reserve VT323 for display, headings, and labels only



\- Do CRT scanline overlay

\- Do VHS tracking distortion

\- Do Phosphor glow

\- Do Chunky pixel borders

\- Do Tape reel animations

\- Do Command-line text effects





\## Use Case



Landing pages, SaaS



