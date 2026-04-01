# Plan: Migrate Default Theme to Build Pipeline (TypeScript + Tailwind)

> Historical note: this plan describes the original migration path. The implemented theme now bundles the SDK through `src/lib/scripts/tiendu-sdk.ts` and uses extensionless relative TypeScript imports.

## Goal

Migrate `~/tiendu/default-theme-2.0` from a buildless theme (vanilla JS + plain CSS in `src/assets/`) to a fully built theme using the CLI build pipeline with TypeScript, esbuild bundling, and Tailwind CSS.

## Current State

```
src/
  assets/
    theme.css          ← 1180 lines of hand-written CSS
    theme.js           ← 1214 lines of vanilla JS (cart, galleries, carousels, variants)
    tiendu-sdk.js      ← 413 lines (storefront SDK, cart iframe, API client)
  layout/
    theme.liquid       ← references theme.css, theme.js, tiendu-sdk.js via asset_url
  sections/            ← 17 .liquid files
  snippets/            ← 2 .liquid files
  templates/           ← 9 .json files
  config/              ← settings_data.json, settings_schema.json
```

All three JS/CSS files are in `src/assets/` and treated as **static assets** (copied as-is). The build pipeline ignores them for bundling because entry points are only discovered from `src/layout/` and `src/templates/`.

## Target State

```
src/
  layout/
    theme.liquid
    theme.ts             ← JS entry point → dist/assets/layout-theme.bundle.js
    theme.css            ← CSS entry point → dist/assets/layout-theme.bundle.css
  sections/              ← .liquid files (Tailwind classes replace inline styles)
  snippets/              ← .liquid files (Tailwind classes replace inline styles)
  templates/             ← .json files (unchanged)
  config/                ← settings_data.json, settings_schema.json (unchanged)
  assets/
    tiendu-sdk.js        ← stays as static asset (loaded separately, defines window.Tiendu)
  lib/
    cart.ts              ← extracted from theme.js
    product-gallery.ts   ← extracted from theme.js
    hero-carousel.ts     ← extracted from theme.js
    variant-selector.ts  ← extracted from theme.js
    quantity-input.ts    ← extracted from theme.js
```

**Output after `tiendu build`:**
```
dist/
  assets/
    layout-theme.bundle.js    ← bundled + tree-shaken TS modules
    layout-theme.bundle.css   ← Tailwind-processed CSS
    tiendu-sdk.js              ← copied as static asset
  layout/theme.liquid
  sections/*.liquid
  snippets/*.liquid
  templates/*.json
  config/*.json
```

## Risks and Considerations

### 1. `tiendu-sdk.js` must stay as a static asset
`tiendu-sdk.js` defines `window.Tiendu` and is loaded with `defer` separately from `theme.js`. It cannot be bundled into the theme entry point because:
- It sets up a global API (`window.Tiendu`) that must be available before theme.js runs.
- It's a standalone SDK that other themes/scripts may also use.
- It's referenced in `theme.liquid` as `{{ 'tiendu-sdk.js' | asset_url | script_tag }}`.

**Solution:** Keep it in `src/assets/` as a static asset.

### 2. Asset URL references in theme.liquid must change
Currently `theme.liquid` references:
```liquid
{{ 'theme.css' | asset_url | stylesheet_tag }}
{{ 'theme.js' | asset_url | script_tag }}
```

After migration, the bundled output names are different:
```liquid
{{ 'layout-theme.bundle.css' | asset_url | stylesheet_tag }}
{{ 'layout-theme.bundle.js' | asset_url | script_tag }}
```

### 3. CSS custom properties from Liquid settings
The theme injects `--color-primary`, `--color-background`, etc. from Liquid settings as inline `<style>` in `theme.liquid`. Tailwind's CSS will reference these via `var(--color-primary)`. This works fine — Tailwind utility classes and CSS variables are complementary.

### 4. Tailwind replaces ~80% of the CSS, not 100%
Some CSS can't be expressed as Tailwind utilities:
- Complex selectors (`.product-gallery__lightbox.active`)
- Animations (`@keyframes pulse`)
- Custom component styles with multiple pseudo-states

These stay as custom CSS in `theme.css`, alongside Tailwind directives.

### 5. Section `.liquid` files use inline `style` attributes
Some sections (hero-banner, main-product) use inline styles. These should be converted to Tailwind classes where possible, but dynamic Liquid values in `style` attributes (e.g., `style="background-image: url({{ image }})"`) must stay as-is.

### 6. `src/lib/` is not a standard theme directory
The build pipeline copies files from `THEME_SOURCE_OUTPUT_DIRS` (layout, templates, sections, snippets, config). Files in `src/lib/` are **not** copied — they're only used as import sources for the entry point, which is correct. esbuild will bundle them into `layout-theme.bundle.js`.

### 7. Package dependencies
The theme project needs:
```bash
npm init -y
npm install -D typescript tailwindcss @tailwindcss/postcss postcss
```

The build pipeline auto-detects `@tailwindcss/postcss` and uses it without explicit config.

## Step-by-Step Plan

### Step 1: Set up project dependencies

Create `package.json` and install dev dependencies:
```bash
cd ~/tiendu/default-theme-2.0
npm init -y
npm install -D typescript @tailwindcss/postcss postcss
```

`tiendu.config.json` already exists.

### Step 2: Move JS entry point to `src/layout/theme.ts`

Create `src/layout/theme.ts` as the main entry point. It imports from `src/lib/` modules:

```typescript
import { initHeaderCart } from '../lib/cart'
import { initProductGalleries } from '../lib/product-gallery'
import { initHeroCarousels } from '../lib/hero-carousel'
import { initVariantSelectors } from '../lib/variant-selector'
import { initQuantityInputs } from '../lib/quantity-input'

const initTheme = () => {
  initHeaderCart()
  initProductGalleries()
  initHeroCarousels()
  initVariantSelectors()
  initQuantityInputs()
}

document.addEventListener('DOMContentLoaded', initTheme)

// Re-init on section updates (live editor)
window.addEventListener('tiendu:section-updated', () => {
  initTheme()
})
```

### Step 3: Extract JS modules into `src/lib/*.ts`

Split the monolithic `theme.js` (1214 lines) into focused TypeScript modules:

| Module | Responsibility | Approx lines |
|--------|---------------|--------------|
| `cart.ts` | Cart button, badge sync, checkout open | ~60 |
| `product-gallery.ts` | Image carousel, swipe, lightbox, thumbnails | ~250 |
| `hero-carousel.ts` | Auto-play carousel, dots, keyboard nav | ~200 |
| `variant-selector.ts` | Variant selection, price/stock updates, URL sync | ~400 |
| `quantity-input.ts` | +/- buttons, clamping, validation | ~80 |
| `add-to-cart.ts` | Add to cart button state, SDK call | ~100 |

Type the code incrementally — start with basic types for the Tiendu SDK globals, then type each module's internal functions.

### Step 4: Move CSS entry point to `src/layout/theme.css`

Create `src/layout/theme.css` with Tailwind directives:

```css
@import 'tailwindcss';
```

Plus custom CSS that can't be expressed as utilities (animations, complex selectors, component styles that remain).

### Step 5: Convert Liquid templates to use Tailwind classes

Go through each `.liquid` file and replace inline CSS classes with Tailwind utilities where practical:

**Priority order (by impact):**
1. `snippets/product-card.liquid` — used everywhere
2. `sections/header.liquid` — global
3. `sections/footer.liquid` — global
4. `sections/main-product.liquid` — complex, highest CSS usage
5. `sections/hero-banner.liquid` and `hero-carousel.liquid`
6. Remaining sections

**Example conversion:**
```html
<!-- Before -->
<div class="product-card">
  <div class="product-card__image-wrapper">

<!-- After -->
<div class="group overflow-hidden rounded-lg border border-gray-200">
  <div class="aspect-square overflow-hidden">
```

### Step 6: Update `theme.liquid` asset references

```liquid
<!-- Before -->
{{ 'theme.css' | asset_url | stylesheet_tag }}
{{ 'theme.js' | asset_url | script_tag }}

<!-- After -->
{{ 'layout-theme.bundle.css' | asset_url | stylesheet_tag }}
{{ 'layout-theme.bundle.js' | asset_url | script_tag }}
```

`tiendu-sdk.js` reference stays unchanged.

### Step 7: Remove old static files

Delete `src/assets/theme.css` and `src/assets/theme.js` — they're replaced by the bundled entry points.

### Step 8: Verify build and test

```bash
tiendu build                # one-shot build, check dist/ output
tiendu dev                  # watch mode, verify live preview works
```

Verify:
- `dist/assets/layout-theme.bundle.js` exists and contains all modules
- `dist/assets/layout-theme.bundle.css` exists and contains Tailwind output
- `dist/assets/tiendu-sdk.js` exists (static copy)
- All pages render correctly (home, product, collection, search, blog, article, 404)
- Cart functionality works
- Variant selection works
- Gallery/carousel interactions work
- Responsive layout works

## Execution Order

Steps 1-3 and 6-7 can be done first as a "JS → TS migration" without touching CSS. This lets you verify the TypeScript bundling works before tackling the larger Tailwind conversion.

Steps 4-5 are the Tailwind migration, which is the most labor-intensive part — touching every `.liquid` file.

**Suggested phasing:**
1. **Phase A** (TS bundling): Steps 1, 2, 3, 6, 7, 8 — get TS building and running
2. **Phase B** (Tailwind): Steps 4, 5, 8 — convert CSS to Tailwind
