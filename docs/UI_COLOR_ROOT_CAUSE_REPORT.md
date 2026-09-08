# UI Color Root Cause Report

## Root cause

The neon-yellow dashboard was caused by a color-space mismatch, not by a yellow color token.

The design variables are stored as RGB triplets, for example:

```css
--background: 248 250 252;
--foreground: 15 23 42;
--primary: 79 70 229;
```

However, the Tailwind color adapter and several legacy shared CSS declarations consumed those values as `hsl(var(--token))`. The browser therefore interpreted RGB values such as `248 250 252` as HSL components. This produced computed yellow backgrounds and brown text even though the source tokens were Slate/Indigo.

## Evidence

Before the fix, live computed styles included:

| Element                         | Previous computed value   |
| ------------------------------- | ------------------------- |
| `body` background color         | `rgb(255, 255, 0)`        |
| `body` text color               | `rgb(132, 95, 82)`        |
| `.app-header` background        | `rgba(255, 255, 0, 0.7)`  |
| `.dashboard-filters` background | `rgba(255, 255, 0, 0.52)` |

After the fix:

| Element                         | New computed value          |
| ------------------------------- | --------------------------- |
| `body` background color         | `rgb(248, 250, 252)`        |
| `body` text color               | `rgb(15, 23, 42)`           |
| `.hr-app-main` background color | `rgb(248, 250, 252)`        |
| `.panel` background             | `rgba(255, 255, 255, 0.72)` |
| `.dashboard-filters` background | `rgba(241, 245, 249, 0.52)` |
| shared border color             | `rgb(226, 232, 240)`        |

## Files changed

- `tailwind.config.ts` — changed semantic color adapters from `hsl(var(--token))` to `rgb(var(--token))`.
- `src/app/globals.css` — changed remaining shared legacy/premium `hsl(var(--token))` consumers to RGB, including alpha forms.

`src/app/layout.tsx` is the only application stylesheet import; no later competing stylesheet was found.

## Scope and compatibility

- No APIs, business logic, authentication, RBAC, tenant isolation, or database behavior changed.
- Semantic amber warning components remain available intentionally; no neon-yellow styling is used for normal surfaces.
- Existing `.shell`, `.page-shell`, `.panel`, `.metric-card`, `.dashboard-filters`, `.dashboard-grid`, `.empty-state`, and `.toolbar` compatibility classes were retained. Their shared color consumption now uses the correct RGB space rather than being deleted.

## Validation

- Live computed-style trace at `http://localhost:3000/hr/dashboard`: PASS.
- Search of `src/app` and `src/components` for direct yellow styling: no direct yellow surface declaration found; remaining amber usage is semantic warning styling.
- `npm run lint`: PASS with 7 existing unused-code warnings.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `docs/SRS.md`: unchanged.
