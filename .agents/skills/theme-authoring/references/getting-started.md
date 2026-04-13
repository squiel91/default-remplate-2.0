# Theme Authoring Reference

Use this reference for normal theme authoring work in `default-theme-2.0`.

## Start from `src/`

Work in these directories first:

- `src/layout/`
- `src/templates/`
- `src/sections/`
- `src/blocks/`
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

### Add or change a theme block

Use `src/blocks/*.liquid` when a block should own its own markup and schema.

Prefer block files when:

- the same block type should be reusable in more than one section
- a block is a nested container for child blocks
- inline section block schema would become large or repetitive

Block authoring rules:

- declare the block schema in the block file
- reference the block from a section or parent block schema with `{ "type": "block-type" }`
- use schema `presets` when a block should be inserted with default child blocks or default settings
- render child blocks with `{% content_for 'blocks' %}`
- preserve `block.shopify_attributes` on the outer block element when practical

Preferred composition pattern:

- when a section should start with a merchant-editable block composition, define that structure through section `presets`
- when a reusable container block should start with default children, define that structure through block `presets`
- prefer normal preset-created blocks rendered through `{% content_for 'blocks' %}` instead of fixed-placement rendering when merchants should be able to add, remove, reorder, and edit those blocks freely

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
- remember that blocks render in section context, so they can read resolved values from `section.settings.*`

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

Important resolution behavior:

- `section.settings.collection` resolves to a collection object/drop, not just a handle string
- `section.settings.product` resolves to a product object
- list pickers like `product_list` resolve to arrays of resource objects

That means a specialized block can usually read `section.settings.collection.name` or `section.settings.collection.url` directly without re-fetching the resource.

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
