---
name: theme-authoring
description: Use this skill when making normal edits in `default-theme-2.0`, including templates, sections, snippets, theme settings, and CSS. It routes the agent to the standard authoring workflow and the current object-based Liquid model.
---

# Theme Authoring

<when-to-use>
Use this skill for ordinary theme authoring work in `default-theme-2.0`.

Typical cases:

- editing templates
- editing or adding sections
- editing snippets
- editing theme settings
- editing theme CSS
</when-to-use>

<workflow>
1. Treat `src/` as the source of truth.
2. Make the smallest correct Liquid / JSON / CSS change.
3. Keep schema, template JSON, and rendered markup aligned.
4. Prefer object-based Liquid surfaces over legacy custom fetch tags.
5. Preserve customizer compatibility and Spanish route conventions.
</workflow>

<quality-bar>
- No manual `dist/` edits.
- No new TypeScript, Tailwind, or build-first assumptions for normal theme work.
- Prefer merchant-selectable schema settings for curated content.
- Keep section output deterministic for the editor preview.
</quality-bar>

<references>
- `references/getting-started.md`
</references>
