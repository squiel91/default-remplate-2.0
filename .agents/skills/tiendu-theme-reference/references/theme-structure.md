# Theme Structure Reference

Use this reference for file ownership, template/section structure, and route conventions.

For Liquid variable shapes and pagination behavior, read:

- `references/liquid-objects.md`
- `references/liquid-pagination.md`

## Authoritative structure

This theme is authored directly in `src/`.

```text
default-theme-2.0/
├── AGENTS.md
├── README.md
├── .agents/
├── src/
│   ├── layout/
│   │   └── theme.liquid
│   ├── templates/
│   │   ├── index.json
│   │   ├── product.json
│   │   ├── collection.json
│   │   ├── list-collections.json
│   │   ├── page.json
│   │   ├── blog.json
│   │   ├── article.json
│   │   ├── search.json
│   │   └── 404.json
│   ├── sections/
│   │   ├── *.liquid
│   │   ├── header-group.json
│   │   └── footer-group.json
│   ├── blocks/
│   │   └── *.liquid
│   ├── snippets/
│   │   └── *.liquid
│   ├── config/
│   │   ├── settings_schema.json
│   │   └── settings_data.json
│   ├── assets/
│   │   ├── theme.css
│   │   ├── theme.js
│   │   └── *
└── tiendu.config.json
```

## What each area is for

### `src/layout/`

`theme.liquid` is the global storefront shell.

It is responsible for:

- document structure
- meta tags and SEO defaults
- global CSS variables from theme settings
- asset includes
- rendering header and footer section groups
- theme editor preview message hooks

### `src/templates/`

Each JSON file declares page composition for a template.

### `src/sections/`

Sections are the main building blocks of the storefront.

Each section should:

- render its own markup
- declare editable settings in `{% schema %}`
- declare allowed block types when the merchant should compose repeated content
- declare `presets` when the section should start with a default block tree

### `src/blocks/`

Theme blocks are reusable block types rendered from section or parent block schemas.

Each block should:

- render its own markup
- declare editable settings in `{% schema %}`
- declare nested child block types when it is a container
- declare `presets` when it should start with default child blocks or settings when inserted
- render children with `{% content_for 'blocks' %}` when it accepts nested blocks

Preferred authoring pattern in this theme:

- use normal preset-created blocks rendered through `{% content_for 'blocks' %}` when merchants should be able to add, remove, reorder, and edit them freely
- reserve fixed-placement rendering for cases that truly require a dedicated slot

### `src/snippets/`

Snippets hold reusable markup.

### `src/config/`

- `settings_schema.json` defines editable theme settings
- `settings_data.json` stores current values and group section instances

### `src/assets/`

Static assets used by the storefront.

Use `asset_url` in Liquid when referencing them.

## Merchant-selected resource settings

Prefer schema types such as:

- `collection`
- `collection_list`
- `page`
- `page_list`
- `article`
- `article_list`
- `product`
- `product_list`

Important behavior:

- single-resource settings like `collection` and `product` resolve to usable resource objects/drops in Liquid
- blocks rendered inside a section can read those resolved values through `section.settings.*`

## Patterns to avoid

Do not add or reintroduce:

- `{% products %}`
- `{% categories %}`
- `{% pages %}`
- `{% blog_posts %}`

## Routes and language conventions

The storefront follows Spanish routes:

- `/productos`
- `/categorias`
- `/paginas`
- `/blog`
- `/busqueda`

## Practical ownership rules

- Layout-wide globals, assets, and CSS variables belong in `src/layout/theme.liquid`.
- Page composition belongs in `src/templates/*.json`.
- Editable markup belongs in `src/sections/*.liquid` and should use `{% schema %}`.
- Reusable block markup belongs in `src/blocks/*.liquid` and should use `{% schema %}`.
- Reusable markup belongs in `src/snippets/*.liquid`.
- Theme-level settings belong in `src/config/settings_schema.json` and `src/config/settings_data.json`.
- Do not edit `dist/`; author in `src/`.
