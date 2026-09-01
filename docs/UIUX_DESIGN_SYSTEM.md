# HRMS UI/UX Design System

## Visual language

The system uses a pale slate and indigo enterprise foundation with restrained glass surfaces. The app background is `#F8FAFC`, surfaces are `#FFFFFF`, primary is `#4F46E5`, hover is `#4338CA`, secondary accent is `#6366F1`, violet accent is `#7C3AED`, main text is `#0F172A`, secondary text is `#475569`, and borders are `#E2E8F0`. Semantic success, warning, danger, and info colors remain emerald, amber, red, and blue.

## Foundations

- Typography: system sans stack, compact labels, high-contrast page titles, restrained metadata, and tabular-friendly KPI numerals.
- Spacing: existing 4px scale with larger 16px/24px page rhythm for operational surfaces.
- Radius: 12px controls and cards, 16px panels, 24px login surface.
- Elevation: subtle border-first surfaces with restrained shadows; glass cards use a translucent white surface, 20px blur, a soft white border, and `0 20px 50px rgba(15, 23, 42, 0.08)`.
- Gradients: the navigation uses a dark slate-to-indigo gradient; primary actions and highlighted navigation use the `#4F46E5 → #6366F1 → #7C3AED` accent gradient. Liquid radial accents are used sparingly on the light app background.
- Motion: 120–180ms transitions for buttons, navigation, card hover, and focus; no business-state animation.

## Shared patterns

- App shell: fixed desktop navigation, sticky translucent header, responsive content area.
- Mobile navigation: full-height accessible overlay with tenant-preserving links.
- Page surfaces: `.page-shell`, `.panel`, `.dashboard-grid`, `.metric-card`, `.dashboard-list`, `.candidate-row`.
- Forms: grouped controls, consistent height, rounded borders, visible focus, and primary action elevation.
- Empty/error: dashed or muted surfaces with readable status text; no fabricated metrics.
- Data: existing API values and existing links are preserved.

## Responsive behavior

The shell collapses to a full-width content layout below desktop breakpoint, exposes navigation through the mobile menu, stacks toolbars and cards on narrow screens, and retains horizontal safety for dense data surfaces.
