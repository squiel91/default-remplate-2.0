# @ckreidl/sis

Add icon snippets from [Lucide](https://lucide.dev), [Heroicons](https://heroicons.com), and more to your Shopify theme.

## Usage

```bash
npx @ckreidl/sis add lucide menu chevron-down arrow-right
```

This creates Liquid snippets in your `snippets` directory:

```text
snippets/
  icon-menu.liquid
  icon-chevron-down.liquid
  icon-arrow-right.liquid
```

Use them in your theme:

```liquid
{% render 'icon-menu' %}
{% render 'icon-menu', size: 32 %}
{% render 'icon-menu', class: 'text-primary' %}
{% render 'icon-menu', stroke_width: 1.5 %}
```

## Commands

### add

Add icon snippets to your theme:

```bash
npx @ckreidl/sis add <library>:<variant> <icons...> [options]

Options:
  -d, --dir <path>      Snippets directory (default: "snippets")
  -p, --prefix <prefix> Prefix for snippet filenames (default: "icon-")
  -f, --force           Overwrite existing snippets
```

Example:

```bash
npx @ckreidl/sis add lucide menu chevron-down arrow-right
npx @ckreidl/sis add heroicons:24/solid user search
```

### search

Search for icons by name:

```bash
npx @ckreidl/sis search <library> <icon>
```

Example:

```bash
npx @ckreidl/sis search lucide arrow
# Found similar: arrow-up, arrow-down, arrow-left, arrow-right, ...
```

### tags

List available tags in the icon library:

```bash
npx @ckreidl/sis tags <library>
```

Example:

```bash
npx @ckreidl/sis tags lucide
# accessibility [4 icons]
# account [17 icons]
# action [5 icons]
# add [22 icons]
# ...
```

### variants

List available variants in the icon library:

```bash
npx @ckreidl/sis variants <library>
```

Example:

```bash
npx @ckreidl/sis variants heroicons
# heroicons contains the following variants:
#   * 16/solid
#   * 20/solid
#   * 24/solid
#   * 24/outline
#   * default (24/outline)
```