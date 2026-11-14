# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Court-booking web app for INA Sports (LPUK Kemenpora). Read `PRODUCT.md` for the users, the journey, and the brand rules before making UI decisions. UI copy is Indonesian only.

## Commands

```bash
npm run dev -- --port 3001   # dev server (3000 often clashes with other local projects)
npm run check                # assert-based check of pricing/voucher/date logic (src/lib/booking.check.ts)
npx tsc --noEmit             # type-check; run `npx next typegen` first if PageProps/LayoutProps types are missing
npm run lint
npm run build                # production build; also prints which routes are static vs partial prerender
vercel --prod                # deploy (only after the user asks)
```

There is no test framework. `npm run check` is the only test: plain Node 24 running a `.ts` file (type stripping), which is why `tsconfig.json` sets `allowImportingTsExtensions`.

## Next.js 16 with Cache Components

`next.config.ts` turns on `cacheComponents` and `partialPrefetching`. This changes how pages must be written. Check `node_modules/next/dist/docs/` rather than memory:
- Anything that reads `params`, `searchParams`, the current time, or `localStorage` must sit inside `<Suspense>`. Otherwise dev shows the "URL data outside of Suspense" insight or the build fails.
- Browser-only client components start with `use(browser("reason"))` (from `react-dom`, React 19.3) and get a skeleton fallback. `SlotPicker`, `CheckoutForm`, `Confirmation` and `BookingList` all follow this pattern.
- `/venue/[slug]` keeps its back link in the static shell and awaits `params` in a child under Suspense. `dynamicParams` is not allowed. Unknown slugs call `notFound()` inside the boundary.

## Architecture

- `src/lib/venues.ts` is the whole catalog: 4 venues, their courts (price per hour), hours, photos and `comingSoon`. Prices are placeholders until LPUK provides the official tariff.
- `src/lib/booking.ts` holds pricing and booking rules: `quote()` (payment fee + voucher, capped), `PAYMENT_METHODS`, `VOUCHERS`, `isBookedByOthers()` (deterministic fake occupancy, about 30%), statuses (`pending|paid|cancelled|expired` stored; `shownStatus()` adds `done` and turns a lapsed hold into `expired`), `HOLD_MINUTES` (10), `canCancel()` (≥ `CANCEL_HOURS` 2 before start), `isSlotTaken()` (fake crowd + active bookings), and the `ina-bookings` store.
- `src/lib/auth.ts` is **demo-only** auth in localStorage (`ina-users`, `ina-session`, `ina-login-tries`): register, Google stand-in, login with 5-try/15-min lock, verify and reset tokens shown on screen instead of emailed. Pure rules at the top (`phoneOk`, `normalizePhone`, `passwordOk`, `safeNext`, `failTry`) are covered by `npm run check`. Replace the rest with Clerk (PRD phase 1).
- `src/lib/useStore.ts`: `useUser()` / `useBookings()` subscribe to localStorage via `useSyncExternalStore`, so the header, pages and `/preview` frames update live. Writes go through `storage.ts` `writeJSON()`, which fires the in-tab event.
- Flow: `SlotPicker` → `/checkout?venue=&court=&date=&hour=` → login gate (`redirect` to `/masuk?next=`; Google sign-ups without a phone go through `/daftar/whatsapp`) → `CheckoutForm` re-validates and saves a `pending` booking with a hold → `/booking/[id]/bayar` (countdown, "Saya sudah bayar (demo)") → `/booking/[id]` (owner only; cancel, rebook) → `/bookings` (tabs). Logged-in guards use `redirect()` during render inside the browser-only components.
- There's no backend or real payment yet. Going real means swapping `auth.ts` for Clerk, the localStorage stores for a database (Vercel Marketplace), booking creation for a server action, and `isBookedByOthers` for a real availability query. `docs/PRD.html` is the spec.

## Styling

- Tailwind v4 + shadcn/ui (Radix, `components.json`). There is no `tailwind.config`. Tokens live in `src/app/globals.css`: shadcn names in `:root` (`--primary` = INA navy, `--muted` = platinum, `--muted-foreground` = grey text, `--destructive` = dark red, `--radius` 0.75rem) plus INA brand names in `@theme` (`integrity*`, `victory*`, `ink`, `line`, `platinum`, `ok*`). Prefer the shadcn names in new code. Light only: no `.dark` theme. `text-muted` is a background tint now; grey text is `text-muted-foreground`.
- shadcn components live in `src/components/ui/` and are our code: edit them freely. Add more with `npx shadcn@latest add <name>`, and answer "n" when it asks to overwrite `button.tsx` (it carries the INA variants and sizes).
- Buttons: `<Button>` or `buttonVariants({ variant, size, className })` on a `<Link>`/`<a>`. Red `cta` is for the one main action per screen; everything else is navy `default`, `outline` or `ghost`. Use `destructive` for cancel/delete, confirmed with `AlertDialog`.
- `src/components/styles.ts` still has class strings (`card`, `input`, `label`, `eyebrow`) for v1 screens. Switch a screen to shadcn `Card`/`Input`/`Label` when you rework it.
- Pages live in the `src/app/(site)/` route group, whose layout adds Header/Footer. `/preview` sits outside it and shows any page (picker at the top) in a desktop and a phone iframe side by side for design review.
- Grids that contain the slot table need `grid-cols-[minmax(0,1fr)]` on mobile, and `<fieldset>` around horizontal scrollers needs `min-w-0`. Without them the page scrolls sideways at 375px.

## Assets and references

- `public/brand/logo.svg` / `logo-light.svg` and `public/images/venues/*.webp` were downloaded from https://inasports.vercel.app (`/images/venues/<name>.webp`). Fetch new court photos from there and don't hotlink.
- UX reference: Figma Make file "Sport venue booking app (Community)" (`C9gF8KMnziclcuBt5mbBUj`). The Figma MCP has no access to it, so open it in Chrome to check the flow.
- `docs/PRD.html` is the full product spec (register, login, booking, history, data model, release phases). `PRODUCT.md` is the short brief.
