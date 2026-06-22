## Goal

Make `/` (password gate) and `/chat` feel like the same product by extracting a single set of design tokens and applying them consistently. No layout changes — only colors, fonts, radii, shadows, and orb treatment.

## Shared Design Tokens

Add CSS variables to `src/styles.css` under `:root` so both pages reference the same values:

```text
--pb-ink:        #3d1020   /* primary text / dark surface */
--pb-ink-soft:   rgba(61,16,32,0.78)
--pb-cream:      #f5e0c0   /* on-dark text */
--pb-warm-1:     #fef0b0   /* warm yellow */
--pb-warm-2:     #fcc870   /* warm amber */
--pb-warm-3:     #f8a060   /* peach */
--pb-coral:      #c04030   /* accent / error */
--pb-amber-deep: #8b4a0a   /* secondary text on warm bg */
--pb-mint:       rgba(112,224,184,0.45)
--pb-border:     #f0e8d0

--pb-radius-sm:  8px
--pb-radius-md:  12px
--pb-radius-lg:  14px

--pb-shadow-sm:  0 1px 2px rgba(61,16,32,0.06)
--pb-shadow-md:  0 8px 24px -12px rgba(61,16,32,0.18)
--pb-shadow-lg:  0 20px 60px -20px rgba(61,16,32,0.25)

--pb-font-display: 'Playfair Display', serif
--pb-font-body:    'Gowun Batang', serif
```

## Typography Unification

- **Headings / brand / buttons**: `Playfair Display` on both pages.
  - Password: keep H1 + "Enter Now" button (already Playfair).
  - Chat: switch nav "Profile" button, session tab labels, panel header "내 독서 프로필", and the "새 세션 시작" CTA to Playfair Display.
- **Body / chat bubbles / input / small text**: `Gowun Batang`.
  - Password: switch "PEEKABOOK" tag, "Smarter picks…" subtext, input, and footer "Team Let's Read!" from DM Sans / Cormorant to Gowun Batang (keep their existing sizes, weights, letter-spacing).
  - Chat: already Gowun Batang — leave bubbles/input as-is.
- Remove DM Sans + Cormorant Garamond from the Google Fonts `<link>` in `src/routes/__root.tsx` once unused.

## Orbs (consistent warm gradient on both pages)

Chat currently uses small mint/yellow corner orbs; password uses a full warm radial. Reconcile so both pages share the same orb "signature":

- Keep the password page's warm center radial as its hero background (it's the page's identity).
- Add a matching **warm orb pair** to chat that echoes the password palette, replacing the current ones:
  - Top-left, 280px: `radial-gradient(ellipse at 0% 0%, rgba(254,240,176,0.55) 0%, rgba(252,200,112,0.18) 45%, transparent 75%)`
  - Bottom-right, 320px: `radial-gradient(ellipse at 100% 100%, rgba(248,160,96,0.35) 0%, rgba(112,224,184,0.18) 45%, transparent 75%)`
- Same orb pair (smaller, ~200px, lower opacity) added as a subtle overlay on the password page corners so the eye recognizes the same motif when transitioning.

## Buttons / Radius / Shadows

- All pill/tag buttons → `border-radius: var(--pb-radius-sm)` (8px). Chat session tabs, Profile toggle, `+` button, "새 세션 시작" already 8px — keep.
- Password "Enter Now" button: change radius from 7px → 8px, swap inline color literals for tokens (`background: var(--pb-ink)`, `color: var(--pb-cream)`), and add `box-shadow: var(--pb-shadow-md)` so it matches the elevated feel of chat's send button.
- Chat send button (28px circle): keep shape, add `box-shadow: var(--pb-shadow-sm)`.
- Chat bubbles & input: keep 12–14px radii (already aligned with token scale).
- Profile panel & nav: add `box-shadow: var(--pb-shadow-sm)` to nav bottom edge and panel right edge for consistent depth.

## Color Token Migration (no visual regression)

Replace hardcoded literals in both files with `var(--pb-*)` tokens where they map 1:1. Keep existing opacities. This is mechanical — no new colors introduced beyond the orb additions above.

## Files Touched

- `src/styles.css` — add `:root` token block.
- `src/routes/__root.tsx` — trim Google Fonts URL to only `Playfair Display` + `Gowun Batang`.
- `src/routes/index.tsx` — font swaps, button radius/shadow, token migration, add subtle corner orbs.
- `src/routes/chat.tsx` — Playfair on headings/buttons/tabs/panel header, replace orbs with warm pair, add shadows, token migration.

## Out of Scope

- No layout, spacing, copy, or behavior changes.
- No changes to chat API logic, profile panel structure, or routing.
