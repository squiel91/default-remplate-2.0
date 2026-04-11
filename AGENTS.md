# Tiendu Default Theme 2.0

This theme is a Tiendu Liquid theme authored directly in `src/`.

For agent work, the supported authoring surface is:

- Liquid templates and sections
- JSON template and section-group files
- Theme settings JSON
- Plain CSS
- Static assets and snippets

Do not assume a supported TypeScript, Tailwind, or build-pipeline workflow for new work in this theme.

## Read first

- Read `.agents/skills/theme-authoring/SKILL.md` for the expected editing workflow.
- Read `.agents/skills/tiendu-theme-reference/SKILL.md` for the directory map, Liquid object shapes, and pagination behavior.
- Read `.agents/skills/add-icon-snippets/SKILL.md` if the task involves adding or replacing icon snippets.
- Read `.agents/skills/deploy-with-tiendu-cli/SKILL.md` if the task involves CLI setup, pulling, preview sync, push, or publish.

## Agent priorities

- Work in `src/`, not `dist/`.
- Prefer the smallest correct Liquid / JSON / CSS change.
- Keep sections schema-driven so the admin customizer can edit them.
- Prefer the current object-based Liquid API over legacy custom data-fetch tags.
- Preserve Spanish storefront URLs and content structure unless the user asks otherwise.
- For CLI work, prefer `--non-interactive` commands.

## Source of truth

Authoritative theme files live under `src/`:

- `src/layout/theme.liquid` — root layout, global CSS variables, shared assets, header/footer groups
- `src/templates/*.json` — page composition per template
- `src/sections/*.liquid` — editable theme sections
- `src/sections/*-group.json` — global section groups like header/footer
- `src/snippets/*.liquid` — reusable partials
- `src/config/settings_schema.json` — theme setting definitions
- `src/config/settings_data.json` — current theme setting values and global section instances
- `src/assets/*` — static assets, including the committed storefront CSS and JS

`dist/` is a generated upload artifact for the CLI, not an authoring surface.

When a task involves syncing or deploying the theme with the CLI, use the skill-style workflow in `docs/deploy-with-cli.md`.

## Directory map

```text
src/
  layout/
    theme.liquid            Root storefront layout
  templates/
    index.json              Home page composition
    product.json            Product page composition
    collection.json         Collection page composition
    list-collections.json   Collection index composition
    page.json               Static page composition
    blog.json               Blog index composition
    article.json            Article composition
    search.json             Search composition
    404.json                Not-found composition
  sections/
    *.liquid                Theme sections with `{% schema %}`
    header-group.json       Header section group definition
    footer-group.json       Footer section group definition
  snippets/
    *.liquid                Reusable partials and icons
  config/
    settings_schema.json    Theme setting definitions for the editor
    settings_data.json      Current values and global section state
  assets/
    theme.css               Committed storefront stylesheet
    theme.js                Committed storefront script
    *                       Other storefront assets
```

## Template model

This theme is section-based.

Each page template in `src/templates/*.json` declares:

- `sections` — keyed instances of section types
- `order` — render order of those section instances

Example:

```json
{
  "sections": {
    "main-product": {
      "type": "main-product",
      "settings": {}
    },
    "related": {
      "type": "related-products",
      "settings": {
        "title": "Tambien te puede interesar",
        "limit": 4
      }
    }
  },
  "order": ["main-product", "related"]
}
```

Header and footer are not declared in page templates. They are rendered from:

- `src/sections/header-group.json`
- `src/sections/footer-group.json`

through `src/layout/theme.liquid`.

## Section schema rules

Every editable section must declare a `{% schema %}` block.

Use schema for:

- section name
- section settings
- blocks
- block settings
- presets and limits where needed

The admin theme editor depends on schema metadata to:

- list available sections
- render setting inputs
- add and remove blocks
- reorder sections and blocks
- update preview HTML live

If a section should be editable in the customizer, its configuration must be represented in schema and template JSON, not hidden in hardcoded markup.

## Global theme settings

Theme-level settings are defined in `src/config/settings_schema.json` and consumed in `src/layout/theme.liquid`.

Current important behavior:

- color settings are mapped to CSS custom properties like `--color-primary`
- typography settings are mapped to font-related CSS variables
- the customizer can hot-update color variables without a full page reload

When adding a new global setting:

1. define it in `settings_schema.json`
2. expose it in `theme.liquid` as a CSS variable or layout-level value if needed
3. consume it from sections/snippets with `var(--...)` or normal Liquid access

## Current Liquid object model

Need the exact Liquid-facing schema, route availability, section setting resolution, or lazy/eager behavior? Read:

- `.agents/skills/tiendu-theme-reference/references/liquid-objects.md`
- `.agents/skills/tiendu-theme-reference/references/liquid-pagination.md`

Prefer these objects and properties.

### Core objects

- `settings`
- `section`
- `product`
- `collection`
- `page`
- `blogPost`
- `blog`
- `search`
- `store`
- `shop`
- `request`
- `paginate`

### Current pagination/data surfaces

- `collection.products`
- `collection.products_count`
- `product.related_products`
- `product.related_products_count`
- `search.results`
- `search.results_count`
- `blog.articles`
- `blog.articles_count`

Use them with `{% paginate %}` when rendering paginated lists.

Examples:

```liquid
{% paginate collection.products by section.settings.products_per_page %}
  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}
{% endpaginate %}
```

```liquid
{% paginate product.related_products by section.settings.limit %}
  {% if product.related_products_count > 0 %}
    {% render 'product-listing-grid', products: product.related_products %}
  {% endif %}
{% endpaginate %}
```

```liquid
{% paginate search.results by section.settings.results_per_page %}
  {% if search.results_count > 0 %}
    {% for product in search.results %}
      {% render 'product-card', product: product %}
    {% endfor %}
  {% endif %}
{% endpaginate %}
```

## Search and blog behavior

The current search surface is product-only.

Available search fields:

- `search.terms`
- `search.performed`
- `search.results`
- `search.results_count`

The current blog surface exposes:

- `blog.articles`
- `blog.articles_count`

## Collection, page, and article pickers

When a section needs merchant-selected resources, prefer schema setting types such as:

- `collection`
- `collection_list`
- `page`
- `page_list`
- `article`
- `article_list`
- `product`
- `product_list`

Prefer editor-selected lists over runtime “fetch everything” patterns.

Examples already in this theme:

- `featured-categories.liquid` uses `collection_list`
- `footer.liquid` uses `page_list`
- `recent-posts.liquid` uses `article_list`

## Legacy tags to avoid

Do not introduce or rely on these legacy block tags:

- `{% products %}`
- `{% categories %}`
- `{% pages %}`
- `{% blog_posts %}`

The supported theme direction is object-based Liquid access with `{% paginate %}` where needed.

## Routing expectations

This theme assumes Tiendu storefront routes in Spanish:

- `/productos`
- `/categorias`
- `/paginas`
- `/blog`
- `/busqueda`

When generating links manually, keep those route conventions.

## URL and link conventions

- Use the URL already provided by the resource when available: `product.url`, `collection.url`, `page.url`, `post.url`
- Use `asset_url` for theme assets
- Use `escape_attr` in attributes
- Keep breadcrumb and “back to” query parameter behavior when a section already uses it

## Styling rules

- Prefer plain CSS edits in `src/assets/theme.css` or section markup classes
- Reuse existing CSS variables from `theme.liquid`
- Do not assume Tailwind is a supported authoring layer for new work
- Do not introduce a new CSS build dependency
- Keep styles compatible with live section replacement in the theme editor

## Snippets and icons

- Put reusable markup in `src/snippets/`
- Keep snippet inputs explicit via `render` parameters
- Icon snippets in this theme follow the `icon-*.liquid` naming pattern
- See `docs/adding-icons.md` for the snippet-generation workflow

## Layout behavior

`src/layout/theme.liquid` is responsible for:

- SEO meta tags
- font loading
- CSS variable injection
- shared asset includes
- rendering header/footer section groups
- editor live-preview message handlers

Do not move page-specific markup into the layout unless it truly applies to every page.

## Editor compatibility

The admin customizer updates sections by fetching server-rendered HTML and replacing a section root in the iframe.

That means:

- section markup should remain self-contained
- interactive hooks should survive section re-rendering
- settings should produce deterministic HTML for a given section instance
- color settings should keep working through CSS custom properties

## Safe editing checklist

- Edit `src/`, not `dist/`
- Keep schema and template JSON in sync
- Prefer object-based Liquid over legacy tags
- Preserve Spanish storefront routes
- Use merchant-selectable settings for curated lists
- Keep sections compatible with live preview replacement
- Keep layout-level settings in `settings_schema.json` + `theme.liquid`
