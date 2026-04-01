# Tiendu Default Theme 2.0

This is a Liquid storefront theme for Tiendu with a sections-based architecture and an esbuild-powered build pipeline. It is the starting point for Tiendu themes.

## How to work on it

- Read `docs/getting-started.md` for setup and development workflow.
- Read `docs/theme-structure.md` for the directory layout, build conventions, and how to add new sections and entry points.
- Run `tiendu build` to build. Run `tiendu dev` to develop with live preview.
- Run `npm run check` to type-check without building.

## Theme architecture

This theme uses a **sections-based architecture**. Pages are composed from reusable sections defined in JSON templates:

- **JSON templates** (`templates/*.json`) declare which sections appear on each page and in what order.
- **Sections** (`sections/*.liquid`) are self-contained components with settings and blocks declared via `{% schema %}`.
- **Global sections** (header, footer) are defined in `config/settings_data.json` and rendered from the layout.
- **Theme settings** (colors, typography) are configured in `config/settings_schema.json` and applied as CSS custom properties.

## Directory structure

```
src/                 — Source Liquid, TypeScript, CSS, and assets
  layout/            — Layout Liquid + entry files (theme.liquid, theme.ts, theme.css)
  templates/         — JSON template files defining section composition
  sections/          — Section Liquid files with {% schema %} blocks
  snippets/          — Reusable Liquid snippets
  config/            — Theme settings (settings_data.json, settings_schema.json)
  assets/            — Static assets (images, icons, fonts) flattened into dist/assets/
  lib/               — Shared TypeScript and CSS modules (imported by entries, not served directly)
    scripts/         — Imported TypeScript modules grouped by behavior
      cart.ts        — Cart button, badge sync, checkout open
      product-gallery.ts — Product image carousel with swipe and lightbox
      hero-carousel.ts — Auto-play hero carousel with dots and keyboard nav
      variant-selector.ts — Variant selection, price/stock updates, URL sync
      quantity-input.ts — Quantity +/- buttons with clamping
      add-to-cart.ts — Add to cart button state and SDK integration
      tiendu-sdk.ts  — Storefront SDK bundled into the theme entry and exposes window.Tiendu
    styles/          — Imported CSS modules grouped by component
docs/                — Documentation for developers and agents
specs/               — Migration plans and specifications
dist/                — Build output (gitignored). This is what gets uploaded to Tiendu.
tiendu.config.json   — Marks this as a built theme
tsconfig.json        — TypeScript config (strict, noEmit, moduleResolution: bundler)
package.json         — npm dependencies (typescript, tailwindcss)
```

## Build pipeline

Entry points are discovered by convention from `src/layout/` and `src/templates/`:

| Source file | Output bundle |
|---|---|
| `src/layout/theme.ts` | `dist/assets/layout-theme.bundle.js` |
| `src/layout/theme.css` | `dist/assets/layout-theme.bundle.css` |

Shared modules in `src/lib/` are bundled into the entries that import them. In practice, TypeScript lives in `src/lib/scripts/` and imported CSS lives in `src/lib/styles/`. They are not served as separate files.

Liquid source files in `src/layout/`, `src/sections/`, `src/snippets/`, and `src/config/` are copied into `dist/` during the build. JSON templates in `src/templates/` are also copied. Static files in `src/assets/` are flattened into `dist/assets/`.

## Sections architecture

### JSON templates

Templates are JSON files that define the sections on a page:

```json
{
  "sections": {
    "main-product": {
      "type": "main-product",
      "settings": {}
    },
    "related": {
      "type": "related-products",
      "settings": { "title": "Related products", "limit": 4 }
    }
  },
  "order": ["main-product", "related"]
}
```

### Section schema

Each section `.liquid` file declares its settings and blocks via `{% schema %}`:

```liquid
{% schema %}
{
  "name": "Hero Banner",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Welcome" },
    { "type": "url", "id": "cta_url", "label": "Button URL" }
  ]
}
{% endschema %}
```

Settings are accessed as `{{ section.settings.heading }}`. Blocks are accessed as `{{ section.blocks }}`.

### Global sections

Header and footer are global sections defined in `config/settings_data.json`:

```json
{
  "current": { "color_primary": "#2563eb" },
  "sections": {
    "header": { "type": "header", "settings": { "show_search": true } },
    "footer": { "type": "footer", "settings": { "copyright_text": "" } }
  }
}
```

They are rendered in the layout via `{% section 'header' %}` and `{% section 'footer' %}`.

## TypeScript conventions

- All source files are `.ts` with strict typing — no `any`.
- Shared modules live in `src/lib/` and are imported by entry points.
- The `tsconfig.json` uses `noEmit: true` — TypeScript is only used for type checking. esbuild handles compilation.
- `moduleResolution: "bundler"` is set, so imports use extensionless relative paths (e.g., `from './cart'`) which esbuild resolves to the `.ts` files.
- Run `npm run check` (or `npx tsc`) to type-check. Zero errors is the baseline.

## Import conventions

- TypeScript imports use extensionless relative paths: `import { initHeaderCart } from '../lib/scripts/cart'`
- Static asset imports in TS use relative paths from `src/assets/`
- Type-only imports use `import type`
- CSS uses Tailwind directives: `@import 'tailwindcss';`
- In Liquid, use `{{ 'filename' | asset_url }}` for all asset references.
- Avoid hardcoded `/assets/...` paths in source files.

## Referencing bundles in Liquid

```liquid
{{ 'layout-theme.bundle.css' | asset_url | stylesheet_tag }}
{{ 'layout-theme.bundle.js' | asset_url | script_tag }}
```

## Tiendu SDK

The Tiendu SDK lives in `src/lib/scripts/tiendu-sdk.ts`. It is bundled into `layout-theme.bundle.js`, defines `window.Tiendu` globally, and provides methods for: products, categories, pages, blog posts, cart, and analytics.

In TypeScript, access it via the global:

```typescript
import { getTiendu } from './tiendu-sdk'

const tiendu = getTiendu()
```

## Custom Liquid tags

The Tiendu Liquid engine provides custom tags for fetching data server-side:

- `{% products %}...{% endproducts %}` — fetch and iterate products
- `{% categories %}...{% endcategories %}` — fetch and iterate categories
- `{% pages %}...{% endpages %}` — fetch and iterate pages
- `{% blog_posts %}...{% endblog_posts %}` — fetch and iterate blog posts
- `{% paginate %}...{% endpaginate %}` — pagination wrapper
- `{% section 'name' %}` — render a global section
- `{% schema %}...{% endschema %}` — declare section settings (parsed, not rendered)
- `{% metadata %}...{% endmetadata %}` — inject metadata

## Custom Liquid filters

- `asset_url` — resolve asset path with cache-busting version
- `stylesheet_tag` — wrap URL in `<link>` tag
- `script_tag` — wrap URL in `<script>` tag
- `money` — format cents as currency using the store's currency
- `handleize` / `url_safe` — slugify text
- `escape_attr` — HTML attribute escaping
- `json` — serialize value to JSON
- `img_url` — image URL (with optional size)
- `time_tag` — format date as `<time>` element
- `default_pagination` — render pagination HTML

## Important conventions

- Product/category/blog/page content is server-rendered in Liquid. TypeScript hydrates interactive behaviors (cart, galleries, carousels, variant selectors).
- All static files (SVGs, images, fonts) belong in `src/assets/`. They are flattened into `dist/assets/`.
- Never create files directly in `dist/` — it is cleaned on every build.
- Use `asset_url` in Liquid templates for all asset references.
- `window.Tiendu` is provided by the bundled theme entry via `src/lib/scripts/tiendu-sdk.ts`.
