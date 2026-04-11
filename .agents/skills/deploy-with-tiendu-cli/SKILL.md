---
name: deploy-with-tiendu-cli
description: Use this skill when work in `default-theme-2.0` involves Tiendu CLI setup, selecting a store, pulling theme files, creating or attaching previews, pushing changes, or publishing live.
---

# Deploy With Tiendu CLI

<when-to-use>
Use this skill for CLI-driven sync and deployment work.

Typical cases:

- CLI initialization
- store selection
- theme pull
- preview create or attach
- push
- publish
</when-to-use>

<workflow>
1. Run CLI commands from the repository root.
2. Prefer `--non-interactive` commands for agent work.
3. Edit `src/`, not `dist/`.
4. Use preview flows for validation.
5. Publish only when the user explicitly asks.
</workflow>

<quality-bar>
- Keep local theme files in sync when required with `pull`.
- Avoid long-running `tiendu dev` sessions unless explicitly requested.
- Treat publish as a deliberate final action.
</quality-bar>

<references>
- `references/deploy-with-cli.md`
</references>
