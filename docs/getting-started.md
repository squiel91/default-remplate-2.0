# Getting Started

## Prerequisites

- Node.js 20 or higher
- A Tiendu store and API key (request one at dev@tiendu.uy)
- Tiendu CLI installed globally: `npm install -g tiendu`

## Setup

```bash
# Clone the theme
git clone git@github.com:squiel91/default-theme-2.0.git my-theme
cd my-theme

# Install dependencies
npm install

# Connect to your store
tiendu init
```

## Development

```bash
tiendu dev
```

This will:

1. Build your source files (`src/`) into `dist/`
2. Attach a preview (or create one interactively) and upload `dist/`
3. Watch for changes in `src/` — rebuilds and syncs automatically
4. Print the preview URL where you can see your theme live

Edit files in `src/` (Liquid, TypeScript, CSS, JSON templates, and assets). Changes sync to the preview automatically.

## Previews

The CLI supports multiple previews per store. Each preview has a unique key and its own URL (`preview-{key}.tiendu.app`).

```bash
# List all your previews
tiendu preview list

# Attach a specific preview for dev/push/publish
tiendu preview attach my-preview-key

# Detach the current preview
tiendu preview detach

# Delete a preview
tiendu preview delete [key]
```

When you run `tiendu dev`, `tiendu push`, or `tiendu publish` without specifying a preview key, the CLI uses the attached preview or prompts you to pick one interactively.

You can also pass a preview key directly:

```bash
tiendu push my-preview-key
tiendu pull my-preview-key
tiendu publish my-preview-key
```

## Type checking

Run TypeScript type checking separately from the build:

```bash
npm run check
```

esbuild handles compilation during `tiendu build` / `tiendu dev`. The `check` script runs `tsc --noEmit` for type safety only.

## Building

To run a one-shot build without starting dev mode:

```bash
tiendu build
```

The output goes to `dist/`. Inspect it to verify your bundles.

## Publishing

When your theme is ready for production:

```bash
tiendu publish
```

This publishes the attached preview to the live storefront. Visitors see the new theme immediately.

## Project structure

See `docs/theme-structure.md` for a detailed breakdown of the directory layout and build conventions.
