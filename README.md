# Tiendu Default Theme 2.0

The official starter theme for [Tiendu](https://tiendu.uy) storefronts.

It ships with a modern sections-based architecture, TypeScript for interactive behavior, Tailwind CSS for styling, and the Tiendu CLI build pipeline for local development and deployment.

Check `AGENTS.md` for the full technical specification, or start with `docs/getting-started.md` if you want the complete development workflow.

## Requirements

- Node.js 20+
- [Tiendu CLI](https://www.npmjs.com/package/tiendu) installed globally: `npm install -g tiendu`
- A Tiendu API key associated with your store, available in `Ajustes > General`

## Quick Start

```bash
git clone git@github.com:squiel91/default-theme-2.0.git your-store-name
cd your-store-name
npm install
tiendu init
npm run dev
```

`tiendu init` connects the project to your store once. After that, `npm run dev` builds the theme, opens a preview workflow, and watches for changes.

## AI-Assisted Development

This starter is well suited for AI coding workflows.

For the best experience, pair it with the Tiendu official MCP for access to store admin resources, along with the relevant skills such as `tiendu-theme` and `tiendu-cli`.

## License

Custom Tiendu theme license. See `LICENSE`.
