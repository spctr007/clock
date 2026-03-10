# Christmas Clock Redesign — Design Spec

**Date:** 2026-03-10
**Status:** Implemented

---

## Summary

A complete visual redesign of the main clock webapp (`index.html` + `styles/main.css`) with a classic, festive Christmas theme. All existing functionality is preserved; only the visual layer changes.

---

## Design Decisions

| Question | Choice | Rationale |
|---|---|---|
| Color palette | Classic festive (red/green/gold) | Traditional Christmas feel, strong contrast |
| Animation level | Moderate (snow + twinkling lights) | Festive without distracting from readability |
| Typography | Montserrat (keep existing) | Modern and clean; Christmas colors do the theming |
| Settings & world clocks | Fully re-themed | Ornament button + Christmas-styled world clock cards |

---

## Visual Design

### Background
Deep forest green gradient: `#0d2b1a → #1a472a → #2d5a27` (static, replaces the animated dark navy).

### String Lights
20 colored bulbs (red/green/gold/blue/white) on a wire fixed at the top of the viewport. Each bulb twinkles via staggered CSS `animation-delay` on an `xmas-twinkle` keyframe. Pure CSS/HTML — no canvas.

### Falling Snow
~80 semi-transparent white circles on a `<canvas id="snow-canvas">` (z-index: 1), animated via `requestAnimationFrame`. Varying size (1.5–4.5px), speed, drift, and opacity for a natural look.

### Christmas Village
A `<canvas id="village-canvas">` (z-index: 0, static, drawn once) at the bottom of the viewport depicting a silhouette village scene scaled to viewport width (scale = `W / 1440`):
- Far background pine trees (semi-transparent, smaller)
- Left pine cluster → small cottage → pine → medium house
- **Church** (prominent center-left focal point with steeple, golden cross, arched windows, bell tower)
- Pine → large 3-window house → pine pair → medium cottage → tall townhouse
- Right pine cluster → right cottage → far-right pine
- Warm golden glowing windows on all buildings
- Chimney smoke on chimnied buildings
- Snow caps on all rooftops
- Snow-covered ground gradient at the very bottom

### Clock & Text
- Time digits: gold `#ffd700` with layered glow text-shadow
- AM/PM: gold, matching
- Date: warm cream `#fffde7`; date portion highlighted in gold
- Countdown: cream text with a large gold `countdown-number` span that pulses via `xmas-countdown-glow` keyframe animation

### Settings Button
The gear icon is replaced by a CSS-only Christmas ornament:
- Red radial-gradient ball (`#ff6b6b → #c0392b → #7a0000`)
- Gold cap via `::before` pseudo-element
- Shine highlight via `::after`
- Hover: `scale(1.1) rotate(-8deg)` swing animation

### World Clock Cards
- Background: `rgba(13,43,26,0.75)` (dark green, glass-morphism)
- Border: `rgba(255,215,0,0.35)` (gold)
- City name: red `#e74c3c`
- Time digits: gold `#ffd700`
- Date sub-text: cream

---

## Implementation

### Files Changed

| File | Change |
|---|---|
| `styles/main.css` | Appended `CHRISTMAS THEME OVERRIDES` section (~200 lines) |
| `index.html` | Added village canvas, snow canvas, string lights HTML; removed gear emoji from settings buttons; appended village/snow/lights inline JS |

### Architecture Notes
- All Christmas visual code is **additive** — the overrides section in CSS uses specificity to override base styles without touching the originals.
- Village and snow use separate canvases with z-index layering: village (0) → snow (1) → app content (2+).
- Village JS is fully self-contained in an IIFE; redraws on `resize`.
- No new dependencies introduced.

### Preserved Functionality
- Bootstrap 5 dropdown (desktop) and offcanvas (mobile) settings panel
- All settings controls (show seconds, 24h, world clocks, background upload, opacity)
- Christmas countdown with `countdown-number` big-number styling
- NTP sync status indicator
- World clocks section
- Background image upload + opacity
