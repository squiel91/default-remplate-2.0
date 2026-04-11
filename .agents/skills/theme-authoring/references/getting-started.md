# Theme Authoring Reference

Use this reference for normal theme authoring work in `default-theme-2.0`.

## Start from `src/`

Work in these directories first:

- `src/layout/`
- `src/templates/`
- `src/sections/`
- `src/snippets/`
- `src/config/`
- `src/assets/`

Do not treat `dist/` as the source of truth.

## Common editing tasks

### Add or change page composition

Edit the relevant JSON template in `src/templates/`.

Examples:

- `src/templates/index.json`
- `src/templates/product.json`
- `src/templates/collection.json`
- `src/templates/search.json`

Templates declare:

- which section instances exist
- each instance’s settings
- the order they render in

### Add or change a section

Edit or create a section in `src/sections/*.liquid`.

Every editable section should expose its configuration through `{% schema %}`.

That schema drives the Tiendu theme customizer.

### Add or change global settings

Edit:

- `src/config/settings_schema.json` for setting definitions
- `src/layout/theme.liquid` for layout-level consumption

If the setting affects styling globally, map it to a CSS custom property in `theme.liquid`.

### Add or change reusable markup

Use `src/snippets/*.liquid`.

### Add or change styling

Prefer plain CSS in:

- `src/assets/theme.css`

Use and extend the theme’s CSS custom properties rather than introducing a new styling toolchain.

## Data access in Liquid

Prefer the documented object-based Liquid model.

Before assuming an object or property exists, read:

- `.agents/skills/tiendu-theme-reference/references/liquid-objects.md`
- `.agents/skills/tiendu-theme-reference/references/liquid-pagination.md`

Pragmatic rules:

- use `{% paginate %}` for collection, search, related-product, and blog lists
- do not assume a route object and a setting-selected object behave the same way
- pay attention to fields marked lazy, paginate-only, or synthetic in the reference docs

## Resource selection in section settings

When merchants should choose content explicitly, prefer schema setting types such as:

- `collection`
- `collection_list`
- `page`
- `page_list`
- `article`
- `article_list`
- `product`
- `product_list`

Prefer these over “fetch everything” patterns.

## Patterns to avoid

Do not add new uses of:

- `{% products %}`
- `{% categories %}`
- `{% pages %}`
- `{% blog_posts %}`

Do not add new TypeScript, Tailwind, or build-first assumptions for normal theme work.

## Theme editor compatibility

The Tiendu customizer is schema-driven and can hot-reload section HTML.

When editing sections:

- keep the HTML deterministic for a given settings payload
- keep section markup self-contained
- keep settings in schema, not hidden in code
- prefer CSS variables for live theme-setting updates

## Routes and language conventions

Keep the storefront route structure in Spanish:

- `/productos`
- `/categorias`
- `/paginas`
- `/blog`
- `/busqueda`
