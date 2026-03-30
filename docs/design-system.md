# Mashreq design system

This document describes the visual language and implementation patterns for **Mashreq** (مشرق): an Arabic-first, RTL legal-assistant UI built on **Mantine v8** and shared **CSS variables**.

---

## Principles

1. **Arabic & RTL** — Root layout uses `lang="ar"` and `dir="rtl"`. Components should respect RTL; Mantine is configured for RTL-friendly spacing and alignment.
2. **Light UI** — Default color scheme is **light** (not dark). Professional, calm surfaces suitable for long reading.
3. **Trust & clarity** — Legal context requires visible **disclaimers** (amber/yellow alerts), readable body text, and clear hierarchy (title → subtitle → actions).
4. **One stack** — Prefer **Mantine** primitives for new screens. Legacy pages may still use classes from [`src/app/globals.css`](../src/app/globals.css); new work should converge on Mantine.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router) |
| UI library | `@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications` |
| Theme | `MantineProvider` with `defaultColorScheme="light"` — see [`src/components/MantineProviders.tsx`](../src/components/MantineProviders.tsx) |
| Global CSS | [`src/app/globals.css`](../src/app/globals.css) — design tokens + legacy utility classes |
| Font | **Noto Sans Arabic** (Google Font) on `<body>` — [`src/app/layout.tsx`](../src/app/layout.tsx) |
| PostCSS | `postcss-preset-mantine` — [`postcss.config.cjs`](../postcss.config.cjs) |

---

## Color

### CSS variables (`:root`)

Used by `globals.css`, legacy classnames, and inline `style` on gradients:

| Token | Role | Typical use |
|--------|------|-------------|
| `--bg` | Page background | `#f4f7fb` |
| `--surface` | Cards / inputs | `#ffffff` |
| `--border` | Hairlines | `#e2e8f0` |
| `--text` | Primary body | `#1e293b` |
| `--muted` | Secondary text | `#64748b` |
| `--accent` | Links & primary actions | `#2563eb` |
| `--warn-bg` / `--warn-border` | Legal notes | Amber family |
| `--mashreq-hero-top` / `--mashreq-hero-bottom` | Page gradients | Slate tints |
| `--mashreq-paper-border` | Elevated panels | Matches border |

### Mantine theme

- **Primary palette:** `blue` (`primaryColor: "blue"`).
- Use semantic props: `c="dimmed"`, `color="yellow"` on `Alert`, `variant="light"` for subtle fills.

---

## Typography

- **Family:** Inherited from `body` (Noto Sans Arabic). Mantine `theme.fontFamily` is `"inherit"`.
- **Headings:** `fontWeight: 700` in theme; use Mantine `<Title>` with `order={1|2|3}`.
- **Bilingual:** Arabic is default; short English legal lines may use `dir="ltr"` on `<Text>` where needed.

---

## Spacing & radius

- Mantine spacing scale is customized in `createTheme` (`xs` … `xl`).
- **Default radius:** `md` (theme `defaultRadius`).
- Page sections: prefer `Stack` with `gap="md"` or `gap="lg"`.

---

## Layout patterns

### Shell: gradient + paper

Many routes use:

1. Outer `Box` with `minHeight: "100vh"` and a **linear gradient** using `--mashreq-hero-top` / `#ffffff`.
2. Inner `Container` (`size="md"`) + `Paper` with `shadow="sm"`, `radius="lg"`, `withBorder`.

Reference: [`src/app/page.tsx`](../src/app/page.tsx), [`src/app/chat/page.tsx`](../src/app/chat/page.tsx).

### Landing

- Component: [`src/components/landing/MashreqLanding.tsx`](../src/components/landing/MashreqLanding.tsx).
- Hero: centered `Title` + `Text` (muted).
- **Legal:** `Alert` with `variant="light"` and `color="yellow"`.
- **CTA:** `Button` as `Link` to `/chat`.
- **Features:** `SimpleGrid` + `Card` + `ThemeIcon` (emoji placeholders; swap for icons later).

### Chat

- `Paper` for message list; `ScrollArea` for scrollable transcript.
- User vs assistant: `Text` with `fw={600}` and `c="blue.7"` vs `c="dark.7"`.
- Forms: `Textarea`, `TextInput`, `Button` with `loading` where applicable.

### Admin

- `Table` inside `Paper`; same outer gradient background as other app pages for consistency.

---

## Components (when to use what)

| Need | Mantine |
|------|---------|
| Page title | `Title` |
| Body copy | `Text` (`size`, `c`, `lh`) |
| Primary action | `Button` (often `component={Link}` for navigation) |
| Secondary link | `Anchor` + `Link` |
| Legal / warning | `Alert` (`color="yellow"`, `variant="light"`) |
| Grouped content | `Stack`, `Group` |
| Grid of cards | `SimpleGrid` |
| Elevated panel | `Paper` |
| Code / IDs | `Code` |
| Toast | `@mantine/notifications` (`notifications.show`) |

---

## Notifications

Global **Notifications** provider is mounted in `MantineProviders`. Use `notifications.show({ title, message, color })` from client components (e.g. login/register).

---

## Legacy CSS classes

[`globals.css`](../src/app/globals.css) still defines:

- `.app-shell`, `.chat-log`, `.msg`, `.ingest`, `.btn`, etc.

Prefer Mantine on **new** screens; when touching old markup, migrate opportunistically to `Stack`/`Paper`/`Text`.

---

## Extending the system

1. **New tokens** — Add to `:root` in `globals.css` and document them here.
2. **Mantine theme** — Extend `createTheme` in `MantineProviders.tsx` (colors, radius, fonts).
3. **Dark mode** — Not default today; if added, switch `defaultColorScheme` and add a `ColorScheme` toggle, then test Arabic + `Alert` contrast.

---

## File map

| Purpose | Path |
|---------|------|
| Mantine theme + notifications | `src/components/MantineProviders.tsx` |
| Root layout, font, CSS imports | `src/app/layout.tsx` |
| Design tokens & legacy classes | `src/app/globals.css` |
| Landing hero | `src/components/landing/MashreqLanding.tsx` |

---

## Reference

- [Mantine theming](https://mantine.dev/theming/theme-object/)
- [Mantine RTL](https://mantine.dev/guides/rtl/) (RTL is handled at `html` + provider level)
