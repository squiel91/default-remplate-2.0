# Theme Structure

## Directory layout

```
my-theme/
├── tiendu.config.json       # theme metadata, marks this as a built theme
├── package.json             # npm dependencies (typescript, tailwindcss)
├── tsconfig.json            # strict type checking config
├── .gitignore               # dist/, node_modules/, .cli/
│
├── src/                     # source files — Liquid, TypeScript, CSS, and assets
│   ├── layout/              # layout Liquid + entry files
│   │   ├── theme.liquid     # → dist/layout/theme.liquid
│   │   ├── theme.ts         # → dist/assets/layout-theme.bundle.js
│   │   └── theme.css        # → dist/assets/layout-theme.bundle.css
│   ├── templates/           # JSON templates defining section composition
│   │   ├── index.json       # → dist/templates/index.json
│   │   ├── product.json     # → dist/templates/product.json
│   │   ├── collection.json  # → dist/templates/collection.json
│   │   ├── page.json
│   │   ├── blog.json
│   │   ├── article.json
│   │   ├── search.json
│   │   ├── cart.json
│   │   └── 404.json
│   ├── sections/            # section Liquid files → dist/sections/
│   │   ├── header.liquid
│   │   ├── footer.liquid
│   │   ├── hero-banner.liquid
│   │   ├── hero-carousel.liquid
│   │   ├── main-product.liquid
│   │   ├── main-collection.liquid
│   │   ├── newsletter.liquid
│   │   └── ...
│   ├── snippets/            # Liquid snippets → dist/snippets/
│   │   ├── product-card.liquid
│   │   └── ...
│   ├── config/              # theme settings → dist/config/
│   │   ├── settings_data.json    # current settings + global sections
│   │   └── settings_schema.json  # settings definitions
│   ├── lib/                 # shared TypeScript and CSS modules (not entry points)
│   │   ├── scripts/         # imported TS modules used by theme.ts
│   │   │   ├── cart.ts          # cart button, badge sync, checkout open
│   │   │   ├── product-gallery.ts  # image carousel with swipe and lightbox
│   │   │   ├── hero-carousel.ts    # auto-play hero carousel
│   │   │   ├── variant-selector.ts # variant selection, price/stock updates
│   │   │   ├── quantity-input.ts   # quantity +/- buttons
│   │   │   ├── add-to-cart.ts      # add to cart button state
│   │   │   └── tiendu-sdk.ts       # storefront SDK bundled into the theme entry
│   │   └── styles/             # imported CSS modules used by theme.css
│   └── assets/              # static assets flattened into dist/assets/
│       └── favicon.svg
│
└── dist/                    # build output (gitignored)
    ├── layout/
    ├── templates/
    ├── sections/
    ├── snippets/
    ├── config/
    └── assets/
        ├── layout-theme.bundle.js
        ├── layout-theme.bundle.css
        ├── favicon.svg
        └── ...
```

## Build conventions

### Entry discovery

The CLI discovers entry points automatically from two directories:

- `src/layout/*.{js,ts,css}` → `layout-{name}.bundle.{js,css}`
- `src/templates/*.{js,ts,css}` → `template-{name}.bundle.{js,css}`

No configuration is needed — just create a file in the right place.

### Shared modules

Files in `src/lib/` are not entry points. They are imported by entries and bundled into them by esbuild. In practice, scripts live in `src/lib/scripts/` and imported CSS lives in `src/lib/styles/`.

### CSS bundling with Tailwind

The CSS entry point (`src/layout/theme.css`) uses Tailwind CSS:

```css
@import 'tailwindcss';
```

The build pipeline auto-detects `@tailwindcss/postcss` and processes Tailwind utilities. Custom CSS that cannot be expressed as utilities (animations, complex selectors) is also included in this file.

In practice, `src/layout/theme.css` can stay small and import component-scoped CSS modules from `src/lib/styles/`.

Tailwind scans `.liquid`, `.ts`, and `.css` files in `src/layout/`, `src/templates/`, `src/sections/`, and `src/snippets/` for class names.

### Theme file copying

On every build, the CLI copies files from `src/layout/`, `src/templates/`, `src/sections/`, `src/snippets/`, and `src/config/` into `dist/`. Static files in `src/assets/` are flattened into `dist/assets/`.

## Sections architecture

### JSON templates

Templates are JSON files that define which sections appear on a page and in what order:

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

Settings are accessed as `{{ section.settings.heading }}`.

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

### Theme settings

Global settings (colors, typography, etc.) are defined in `config/settings_schema.json` and applied as CSS custom properties in the layout. Sections and Tailwind classes reference these via `var(--color-primary)` etc.

## TypeScript

All source files use TypeScript with strict mode enabled. Key details:

- **No `any`** — all code is fully typed.
- **Imports use extensionless relative paths** — with `moduleResolution: "bundler"`, TypeScript and esbuild resolve them to the actual `.ts` files. Example: `import { initHeaderCart } from '../lib/scripts/cart'`
- **Type-only imports** use `import type`.
- **`tsconfig.json`** uses `noEmit: true` and `moduleResolution: "bundler"`. TypeScript is for type checking only; esbuild handles compilation.
- Run `npm run check` to type-check. Zero errors is the baseline.

## Referencing bundles in Liquid

Use `asset_url` to reference built bundles:

```liquid
{{ 'layout-theme.bundle.css' | asset_url | stylesheet_tag }}
{{ 'layout-theme.bundle.js' | asset_url | script_tag }}
```

The theme bundle already includes the storefront SDK from `src/lib/scripts/tiendu-sdk.ts`, so `theme.liquid` only needs the layout bundle:

```liquid
{{ 'layout-theme.bundle.js' | asset_url | script_tag }}
```

Use `asset_url` for static assets too:

```liquid
{{ 'favicon.svg' | asset_url }}
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

## Adding a new section

1. Create `src/sections/my-section.liquid`
2. Add a `{% schema %}` block declaring the section's settings
3. Reference it in a JSON template (`src/templates/*.json`) by adding an entry to `sections` and `order`
4. The section is copied to `dist/sections/` automatically on next build

## Adding a new shared module

Create a `.ts` file in `src/lib/scripts/` and import it from the layout entry point (`src/layout/theme.ts`). It will be bundled into the output by esbuild.
