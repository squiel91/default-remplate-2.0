---
name: tiendu-theme-reference
description: Use this skill when you need the `default-theme-2.0` file map, Liquid object shapes, route context, section or block setting resolution, pagination behavior, or route conventions.
---

# Tiendu Theme Reference

<when-to-use>
Use this skill when you need reference context before editing.

Typical cases:

- locating the right file
- checking which Liquid variables actually exist on a page
- checking whether a property is eager, lazy, or paginate-only
- checking pagination support and the `paginate` object shape
- checking route conventions
- understanding settings/layout ownership
  </when-to-use>

<workflow>
1. Confirm whether the change belongs in layout, templates, sections, snippets, config, or assets.
2. Check the Liquid object reference before introducing new assumptions about object shape or availability.
3. Check the pagination reference before editing list rendering, counts, or pagination UI.
4. Check route and structure conventions before editing storefront navigation or ownership boundaries.
</workflow>

<quality-bar>
- Prefer the documented Liquid-facing contract over backend assumptions.
- Treat lazy and synthetic fields as supported only where documented.
- Do not reintroduce legacy `{% products %}`, `{% categories %}`, `{% pages %}`, or `{% blog_posts %}` patterns.
- Keep asset references aligned with `src/layout/theme.liquid`.
</quality-bar>

<references>
- `references/theme-structure.md`
- `references/liquid-objects.md`
- `references/liquid-pagination.md`
</references>
