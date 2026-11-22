---
world: warm-industrial
seededFrom: null
---

# Design System — AreWeFucked.xyz

## Color

Strategy: Restrained — neutrals tinted warm from the world plus one accent.

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#1a1410` | Page background (deep warm charcoal) |
| `--bg-raised` | `#221c16` | Raised surfaces, ticker, alert box |
| `--panel` | `#2a231c` | Card backgrounds |
| `--panel-2` | `#342c24` | Hover states, button backgrounds |
| `--line` | `#4a3f33` | Borders, dividers |
| `--line-bright` | `#6b5d4d` | Hover borders |
| `--text` | `#f0e8dc` | Primary text (warm white) |
| `--muted` | `#a89888` | Secondary text |
| `--dim` | `#9a8e7e` | Tertiary text, timestamps |
| `--accent` | `#f0a030` | Primary accent (amber) |
| `--accent-dim` | `#c07820` | Accent hover |
| `--danger` | `#e8453c` | Stale overlay, error states |
| `--ok` | `#4ade80` | Healthy status |
| `--warn` | `#fbbf24` | Warning status |

Dark mode only. No light mode.

## Typography

| Role | Font | Weight | Usage |
|---|---|---|---|
| Display | Bricolage Grotesque | 800 | Headlines, verdict |
| Body | Bricolage Grotesque | 400, 600 | Body text, card titles |
| Mono | JetBrains Mono | 400, 600, 700 | Labels, meta, status pills, timestamps |

Scale: 11px (labels) → 12px (body mono) → 13px (body) → 14px (card title) → 15px (card name) → 16px (section head) → clamp(40-96px) (hero headline).

## Spacing

Base unit: 8px. Scale: 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80px.

## Radius

- Cards, panels: 6px
- Buttons, inputs: 6px
- Pills, badges: 3px
- Thermometer track: 4px

## Components

### Topbar
Sticky, blurred background. Brand left, refresh button right. Brand uses Bricolage Grotesque 800, amber `.xyz` suffix.

### Hero
Grid: 1fr auto. Left: eyebrow (removed), headline, sub, alert box. Right: vertical thermometer. Alert box has left border accent (full border, not side-tab).

### Thermometer
Vertical track with fill from bottom. Amber fill with height transition. Level number below in JetBrains Mono 800.

### Ticker
Horizontal scrolling text with amber accent on hot state. Border top/bottom. JetBrains Mono 12px.

### Cards
Flat panels with 3px left accent bar (state color). Full border. Hover: border-color changes to state color, background lightens. Stale cards at 55% opacity. Weight badge, status pill, quip, detail (2-line clamp), footer.

### Incident cards
Left border accent (state color). Provider name, title, summary, meta (weight, count, since).

### Stale overlay
Full-screen dimmed overlay. Red-bordered card with "oh fuck… we're flying blind" heading.

## Motion

- Ticker: infinite horizontal scroll (28s linear)
- Thermometer fill: height transition 0.5s ease
- Card hover: border-color and background 0.15s
- No glitch effects, no glow animations

## Responsive

- Mobile (≤768px): hero stacks, thermo becomes horizontal bar, cards 2-column minimum 160px
- Reduced motion: ticker animation disabled, all transitions disabled
"""