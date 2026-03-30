# Migration Guide: Static JS/CSS → TypeScript + Tailwind

This document is a reference for migrating the theme from its current state (`src/assets/theme.js` + `src/assets/theme.css`) to the build pipeline (`src/layout/theme.ts` + `src/layout/theme.css` with `src/lib/*.ts` modules). See `specs/default-theme-build-pipeline.md` for the high-level plan.

## Current source files

| File | Lines | Role |
|---|---|---|
| `src/assets/theme.js` | ~1215 | All interactive behavior: cart, gallery, hero carousel, variant selector, quantity input, add-to-cart |
| `src/assets/theme.css` | ~1179 | All styles: reset, header, footer, product grid, product detail, variant selector, carousel, lightbox, hero, pagination, search, article, RTE |
| `src/assets/tiendu-sdk.js` | ~413 | Storefront SDK — **stays as static asset, do not bundle** |

## JS function map

The monolithic `theme.js` contains these logical groups. Each becomes a `src/lib/*.ts` module.

### `src/lib/cart.ts` (~60 lines)

Functions: `setCartQuantity`, `syncCartQuantity`, `initHeaderCart`

DOM contract:
- `#cart-quantity-badge` — `<span>` whose `textContent` is set to cart count
- `#open-cart-button` — `<button>` that opens checkout overlay. Uses `dataset.bound` to prevent double-binding.

SDK usage: `tiendu.cart.getQuantity()`, `tiendu.cart.open(onClose)`

### `src/lib/hero-carousel.ts` (~250 lines)

Function: `createHeroCarousel(root)`

DOM contract (all within a `[data-hero-carousel]` root):
- `[data-role="viewport"]` — swipe/drag container
- `[data-role="track"]` — flex row of slides
- `[data-hero-carousel-slide]` — individual slides
- `[data-role="dots"]` — dot indicator container
- `[data-dot-index]` — individual dot buttons
- `[data-role="prev-image"]`, `[data-role="next-image"]` — nav buttons

Behavior: auto-play (5s interval), swipe/drag, keyboard nav, dot indicators. Stores cleanup function on `root.__tienduHeroCarouselCleanup`.

### `src/lib/product-gallery.ts` (~250 lines)

Function: `createProductGallery(root)` → returns `{ setCurrentIndex, setCurrentImageById, destroy }`

DOM contract (all within `#product-gallery`):
- `[data-role="viewport"]` — swipe/drag container
- `[data-role="track"]` — flex row of slides
- `[data-product-gallery-slide]` — individual slides, each with `data-image-id`
- `[data-role="thumbs"]` — thumbnail strip
- `[data-thumb-index]` — thumbnail buttons
- `[data-role="prev-image"]`, `[data-role="next-image"]` — nav buttons
- `[data-role="open-lightbox"]` — zoom-in button overlay
- `#product-gallery-lightbox` — lightbox overlay (fixed position)
- `[data-role="lightbox-image"]`, `[data-role="backdrop"]`, `[data-role="content"]`, `[data-role="close-lightbox"]` — lightbox internals

### `src/lib/variant-selector.ts` (~400 lines)

Function: `hydrateProduct(root)` → returns cleanup function

DOM contract (all within `.main-product` root):
- `#product-json` — `<script type="application/json">` with product data (id, title, basePriceInCents, baseCompareAtPriceInCents, stock, images, attributes, variants)
- `data-currency-code` attribute on root — currency code (default `UYU`)
- `#variant-selector` — container for variant UI
- `.option-chip` buttons — radio-style chips with `data-attribute-id`, `data-value-id`, `aria-pressed`
- `.variant-select` — dropdown selects with `data-attribute-id`, `data-open`
- `[data-variant-select-trigger]` — dropdown trigger button
- `[data-variant-select-menu]` — dropdown menu (`data-state`: `open`/`closing`)
- `.variant-select__option` — dropdown options with `data-value-id`, `data-label`, `aria-selected`
- `[data-variant-select-label]` — label text in trigger
- `[data-variant-select-trigger-swatch]` — swatch preview in trigger
- `.variant-select__swatch` — swatch element (color/image)
- `#product-price` — price display element
- `#product-compare` — compare-at-price element
- `.product-price-line` — price line container (hidden when no price)
- `#stock-note` — stock indicator with `data-tone` (`success`/`warning`/`error`/`neutral`)
- `.product-stock-note__message` — stock text

### `src/lib/quantity-input.ts` (~80 lines)

Embedded in `hydrateProduct` but extractable.

DOM contract:
- `#product-quantity-input` — container (hidden when no price)
- `.quantity-input__field` — `<input type="number">` with min/max
- `[data-quantity-decrease]`, `[data-quantity-increase]` — +/- buttons

### `src/lib/add-to-cart.ts` (~100 lines)

Also embedded in `hydrateProduct`.

DOM contract:
- `#add-to-cart-button` — primary action button
- `.button__label` — button text span
- `[data-button-icon]` — icon elements toggled by `data-button-icon` name (`plus`, `loader-2`, `message-square`)
- `data-loading-label`, `data-loading-icon`, `data-icon` attributes on button

SDK usage: `tiendu.cart.addProductVariant(variant, quantity, onClose)`

### Shared utilities (inline in target modules)

- `clamp(value, min, max)`
- `toFiniteNumber(value)`, `toFiniteStock(value)`
- `formatMoney(amountInCents, currencyCode)` — uses `Intl.NumberFormat('es-UY', { style: 'currency', currency })`
- `hasPurchasablePrice(product, variant)`
- `normalizeVariants(variants)`
- Variant index: `extractVariantValueMap`, `serializeMap`, `buildVariantIndex`
- Price helpers: `getPriceDataForVariant`, `getVariantSetPriceData`
- Stock helpers: `getVariantSetStockData`, `getSharedVariantCoverImageId`

### Initialization (`src/layout/theme.ts`)

`initializeTheme(scope)`:
1. Calls `initHeaderCart()`
2. Finds all `[data-hero-carousel]` elements within scope → `createHeroCarousel()` each
3. Finds `.main-product` within scope → `hydrateProduct()`

Triggered on:
- `DOMContentLoaded` (or immediately if already loaded)
- `tiendu:section-updated` custom event (from sections editor) — scopes to `[data-section-id="..."]` if available

## CSS → Tailwind mapping

### CSS custom properties (injected in `theme.liquid`)

```css
:root {
  --color-primary: {{ settings.color_primary | default: '#2563eb' }};
  --color-background: {{ settings.color_background | default: '#ffffff' }};
  --color-text: {{ settings.color_text | default: '#1a1a1a' }};
  --color-text-light: {{ settings.color_text_light | default: '#6b7280' }};
}
```

These are referenced throughout CSS as `var(--color-primary)` etc. In Tailwind, use arbitrary values: `bg-[var(--color-primary)]`, `text-[var(--color-text)]`.

### CSS that MUST remain as custom CSS (not Tailwind utilities)

1. **Animations and keyframes:**
   - `@keyframes product-stock-note-pulse` — pulsing dot on stock indicator
   - `@keyframes attribute-select-menu-in` / `attribute-select-menu-out` — dropdown open/close

2. **Complex component styles with state selectors:**
   - `.variant-select[data-open='true'] .variant-select__chevron` — chevron rotation
   - `.variant-select__menu[data-state='open']` / `[data-state='closing']` — animation triggers
   - `.tiendu-carousel__viewport[data-dragging='true']` / `[data-dragging='false']` — cursor states
   - `.tiendu-carousel__viewport:hover .tiendu-carousel__open-indicator` — zoom icon reveal
   - `.product-stock-note[data-tone='success']` / `warning` / `error` — color states

3. **Pseudo-element and complex selectors:**
   - `.variant-select__option + .variant-select__option` — inter-option divider
   - `.quantity-input__field[type='number']::-webkit-outer-spin-button` — spinner removal
   - `.rte p`, `.rte h2`, `.rte ul` etc. — rich text editor content styling

4. **Dynamic Liquid values in styles** (keep as inline `style` attributes):
   - `style="background-image: url({{ image }})"` in hero slides
   - CSS custom property injection in `<style>` block in `theme.liquid`

### CSS that maps cleanly to Tailwind

Most layout, spacing, typography, colors, borders, and responsive rules can become Tailwind classes. Examples:

| CSS | Tailwind |
|---|---|
| `max-width: 1200px; margin: 0 auto; padding: 0 1rem;` | `max-w-[1200px] mx-auto px-4` |
| `display: flex; align-items: center; gap: 1.5rem;` | `flex items-center gap-6` |
| `font-size: 0.9rem; font-weight: 600; color: #0f172a;` | `text-sm font-semibold text-slate-900` |
| `border: 1px solid #e5e7eb; border-radius: 8px;` | `border border-gray-200 rounded-lg` |
| `aspect-ratio: 1; object-fit: cover;` | `aspect-square object-cover` |
| `display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem;` | `grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6` |

## Section files inventory

Each section's Liquid file uses specific CSS classes and DOM hooks. When converting to Tailwind, replace CSS classes with utilities but **preserve all `data-*` attributes and element IDs** that JS depends on.

| Section | CSS classes used | JS hooks |
|---|---|---|
| `header.liquid` | `.header`, `.header__inner`, `.header__logo`, `.header__nav`, `.header__search`, `.header__cart-button`, `.header__cart-icon`, `.header__cart-count` | `#open-cart-button`, `#cart-quantity-badge` |
| `footer.liquid` | `.footer`, `.footer__inner`, `.footer__brand`, `.footer__links`, `.footer__contact`, `.footer__bottom` | None |
| `hero-banner.liquid` | `.hero-banner`, `.hero-banner__sub`, `.btn` | None |
| `hero-carousel.liquid` | `.hero-carousel`, `.tiendu-carousel--hero`, `.tiendu-carousel__*` | `[data-hero-carousel]`, `[data-role=*]`, `[data-hero-carousel-slide]`, `[data-dot-index]` |
| `main-product.liquid` | `.main-product`, `.product-page`, `.product-detail`, `.product-info`, `.product-info__title`, `.product-price-line`, `.product-price`, `.product-compare`, `.product-detail__description`, `.product-stock-note`, `.variant-selector`, `.variant-group`, `.option-chip`, `.variant-select`, `.quantity-input`, `.button`, `.button--primary`, `.product-actions`, `.tiendu-carousel`, `.tiendu-lightbox` | `#product-json`, `#variant-selector`, `#product-gallery`, `#product-price`, `#product-compare`, `#stock-note`, `#add-to-cart-button`, `#product-quantity-input`, `#product-gallery-lightbox`, `data-currency-code`, `data-attribute-id`, `data-value-id` |
| `product-card.liquid` (snippet) | `.product-card`, `.product-card__image`, `.product-card__image--placeholder`, `.product-card__name`, `.product-card__price` | None |
| `featured-products.liquid` | `.featured-products`, `.product-grid` | None |
| `featured-categories.liquid` | `.featured-categories`, `.category-grid`, `.category-card` | None |
| `main-collection.liquid` | `.main-collection`, `.collection-description`, `.product-grid` | None |
| `collection-list.liquid` | `.collection-list`, `.category-grid`, `.category-card` | None |
| `main-blog.liquid` | `.main-blog`, `.post-grid`, `.post-card` | None |
| `main-article.liquid` | `.main-article`, `.article__header`, `.article__cover`, `.article__back`, `.rte` | None |
| `main-search.liquid` | `.main-search`, `.search-form`, `.search-count`, `.search-empty`, `.product-grid` | None |
| `main-page.liquid` | `.main-page`, `.rte` | None |
| `recent-posts.liquid` | `.recent-posts`, `.post-grid`, `.post-card` | None |
| `related-products.liquid` | `.related-products`, `.product-grid` | None |
| `rich-text.liquid` | `.rich-text`, `.rte` | None |
| `not-found.liquid` | `.btn` | None |

## Tiendu SDK type definitions

When creating TypeScript modules, define types for the SDK. The SDK is loaded globally as `window.Tiendu`:

```typescript
// src/lib/types.ts

interface PublicImage {
  id: number
  url: string
  alt: string
}

interface AttributeValue {
  id: number
  attributeId: number
  value: string
  image: PublicImage | null
  color: string | null
}

interface ProductAttribute {
  id: number
  name: string
  displayType: 'radio' | 'dropdown'
  values: AttributeValue[]
}

interface ProductVariant {
  id: number
  priceInCents: number | null
  compareAtPriceInCents: number | null
  stock: number | null
  coverImage: PublicImage | null
  attributes: ProductAttribute[]
}

interface Product {
  id: number
  title: string
  basePriceInCents: number | null
  baseCompareAtPriceInCents: number | null
  stock: number | null
  images: PublicImage[] | null
  description: string | null
  attributes: ProductAttribute[]
  variants: ProductVariant[]
}

interface CartCloseData {
  updatedCartItemsQuantity: number
}

interface TienduClient {
  products: {
    list: (options?: Record<string, unknown>) => Promise<{ data: ProductListing[], pagination: { total: number, page: number, size: number } }>
    get: (productId: number) => Promise<Product>
    getRelated: (productId: number) => Promise<ProductListing[]>
  }
  categories: {
    list: () => Promise<Category[]>
    get: (categoryId: number) => Promise<Category>
  }
  cart: {
    addProductVariant: (variant: { id: number, priceInCents?: number | null }, quantity: number, onClose?: (data: CartCloseData) => void) => Promise<void>
    getQuantity: () => Promise<{ quantity: number }>
    open: (onClose?: (data: CartCloseData) => void) => Promise<HTMLIFrameElement>
  }
  analytics: {
    trackSearch: (params: { query: string, source: string, resultsCount: number }) => void
    trackViewContent: (params: { productId: number, productTitle: string }) => void
  }
}

declare global {
  interface Window {
    Tiendu?: () => TienduClient
  }
}
```

## Migration checklist

### Phase A: TypeScript bundling (no CSS changes)

1. [ ] Create `package.json` with `typescript` dev dependency
2. [ ] Create `tsconfig.json` (strict, noEmit, moduleResolution: bundler)
3. [ ] Create `src/lib/types.ts` with SDK and product types
4. [ ] Extract `src/lib/cart.ts` from theme.js lines 26–70
5. [ ] Extract `src/lib/hero-carousel.ts` from theme.js lines 212–467
6. [ ] Extract `src/lib/product-gallery.ts` from theme.js lines 468–683
7. [ ] Extract `src/lib/variant-selector.ts` from theme.js lines 72–211, 684–1179 (includes quantity, add-to-cart, all variant logic)
8. [ ] Create `src/layout/theme.ts` as entry point importing all modules
9. [ ] Update `src/layout/theme.liquid`: change `theme.js` → `layout-theme.bundle.js`
10. [ ] Delete `src/assets/theme.js`
11. [ ] Run `tiendu build` and verify `dist/assets/layout-theme.bundle.js` exists
12. [ ] Verify all interactive behaviors work (cart, gallery, variants, hero)

### Phase B: Tailwind CSS

1. [ ] Add `tailwindcss`, `@tailwindcss/postcss`, `postcss` to dev dependencies
2. [ ] Move `src/assets/theme.css` content to `src/layout/theme.css`
3. [ ] Add `@import 'tailwindcss';` at the top
4. [ ] Keep custom CSS (animations, complex selectors, RTE) below the import
5. [ ] Convert `snippets/product-card.liquid` to Tailwind classes (highest reuse)
6. [ ] Convert `sections/header.liquid` to Tailwind classes
7. [ ] Convert `sections/footer.liquid` to Tailwind classes
8. [ ] Convert `sections/main-product.liquid` — **preserve all IDs and data-* attributes**
9. [ ] Convert remaining sections one by one
10. [ ] Update `theme.liquid`: change `theme.css` → `layout-theme.bundle.css`
11. [ ] Delete `src/assets/theme.css`
12. [ ] Run `tiendu build` and verify `dist/assets/layout-theme.bundle.css` exists
13. [ ] Verify all pages render correctly and responsively
