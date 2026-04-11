# Deploy With Tiendu CLI Reference

## Scope

- Run CLI commands from the repository root.
- Edit theme code in `src/`.
- Do not edit `dist/` manually.
- Treat this theme as a direct Liquid / JSON / CSS theme for implementation work.
- Prefer `--non-interactive` commands for agent workflows.

## How to invoke the CLI

Use either:

```bash
npx tiendu <command> ...
```

or:

```bash
tiendu <command> ...
```

## Recommended workflow

1. Initialize the CLI with credentials.
2. Select the target store if one was not auto-selected.
3. Pull the current live theme when you need to sync local files with the store.
4. Make code changes in `src/`.
5. Push to a preview for verification.
6. Publish only when the user explicitly asks for it.

## Initialize the CLI

```bash
tiendu init <api-key> [base-url] --non-interactive
```
base-url default is the tiendu server url. You will mostly never need to set a different default.
The seller can obtain the API_KEY by logging into Tiendu ([tiendu.uy/acceso](https://tiendu.uy/acceso)), navigating to Ajustes > General, in the "Riesgoso" Section. 

## Select the store

```bash
tiendu stores list --non-interactive
tiendu stores set <store-id> --non-interactive
```

If the seller only has one store, then that store will be selected automatically. The tiendu init will provide a list of all available stores.

## Preview workflow

```bash
tiendu preview create "agent-preview" --non-interactive
tiendu preview list --non-interactive
tiendu preview attach <preview-key> --non-interactive
tiendu push --non-interactive
tiendu push <preview-key> --non-interactive
```

## Sync the current theme

```bash
tiendu pull --non-interactive
tiendu pull <preview-key> --non-interactive
```
Careful running this. It will override all the src code with the published code.

## Publish workflow

Publish only when the user explicitly requests it:

```bash
tiendu publish --non-interactive
tiendu publish <preview-key> --non-interactive
```

## Common failure cases

- `no store selected`: run `tiendu stores list --non-interactive` and `tiendu stores set <store-id> --non-interactive`
- `no preview selected`: run `tiendu preview create <name> --non-interactive` or `tiendu preview attach <preview-key> --non-interactive`
- credential errors during `init` or `stores list`: rerun `tiendu init <api-key> [base-url] --non-interactive`
