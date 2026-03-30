# Tiendu Default Theme 2.0

The official starter theme for [Tiendu](https://tiendu.uy) storefronts. Built with a sections-based architecture, TypeScript, Tailwind CSS, and the Tiendu CLI build pipeline.

## Requirements

- Node.js 20+
- [Tiendu CLI](https://www.npmjs.com/package/tiendu) (`npm install -g tiendu`)
- A Tiendu store and API key (request one at dev@tiendu.uy)

## Quick start

```bash
git clone git@github.com:squiel91/default-theme-2.0.git my-theme
cd my-theme
npm install
tiendu init     # connect to your store (one time)
tiendu dev      # build, preview, and watch for changes
```

`tiendu dev` attaches a preview, builds your theme, uploads it, and watches for changes. Edit files in `src/` and they sync automatically.

## Project structure

```
├── tiendu.config.json       # marks this as a built theme
├── package.json
├── tsconfig.json            # strict type checking (tsc --noEmit)
├── src/
│   ├── layout/
│   │   ├── theme.liquid     # → dist/layout/theme.liquid
│   │   ├── theme.ts         # → dist/assets/layout-theme.bundle.js
│   │   └── theme.css        # → dist/assets/layout-theme.bundle.css
│   ├── templates/           # JSON templates defining section composition
│   │   ├── index.json
│   │   ├── product.json
│   │   ├── collection.json
│   │   └── ...
│   ├── sections/            # section Liquid files with {% schema %} blocks
│   │   ├── header.liquid
│   │   ├── footer.liquid
│   │   ├── main-product.liquid
│   │   └── ...
│   ├── snippets/            # reusable Liquid snippets
│   ├── config/              # theme settings
│   │   ├── settings_data.json
│   │   └── settings_schema.json
│   ├── lib/                 # shared TypeScript modules (bundled into entries)
│   │   ├── cart.ts
│   │   ├── product-gallery.ts
│   │   ├── hero-carousel.ts
│   │   ├── variant-selector.ts
│   │   └── ...
│   └── assets/              # static assets flattened into dist/assets/
│       └── tiendu-sdk.js    # storefront SDK (loaded separately)
└── dist/                    # build output (gitignored)
```

## Commands

| Command | Description |
|---|---|
| `tiendu dev` | Build + watch + live preview |
| `tiendu build` | One-shot build to `dist/` |
| `tiendu push [previewKey]` | Upload `dist/` to a preview |
| `tiendu pull [previewKey]` | Download a preview (or live theme) into `dist/` |
| `tiendu publish [previewKey]` | Publish a preview to the live storefront |
| `tiendu preview list` | List all your previews |
| `tiendu preview attach [key]` | Attach a preview for dev/push/publish |
| `tiendu preview detach` | Detach the current preview |
| `npm run check` | Run TypeScript type checking (`tsc`) |

## Sections architecture

Pages are composed from reusable sections defined in JSON templates:

- **JSON templates** (`templates/*.json`) declare which sections appear on each page.
- **Sections** (`sections/*.liquid`) are self-contained components with settings declared via `{% schema %}`.
- **Global sections** (header, footer) are defined in `config/settings_data.json` and rendered from the layout.
- **Theme settings** (colors, typography) are configured in `config/settings_schema.json`.

## Storefront SDK

The Tiendu SDK (`src/assets/tiendu-sdk.js`) is loaded as a separate static asset. It defines `window.Tiendu` globally:

```typescript
const tiendu = typeof window.Tiendu === 'function' ? window.Tiendu() : null
```

See the SDK source for the full API (products, categories, pages, blog posts, reviews, cart, analytics).

## Documentation

- `docs/getting-started.md` — setup and development workflow
- `docs/theme-structure.md` — directory layout, build conventions, and how to add new sections

## License

MIT
