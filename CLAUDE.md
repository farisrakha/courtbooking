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
vercel --prod                # manual production deploy (only when asked; pushes to main already deploy)
```

Production: https://courtbooking-liard.vercel.app (Vercel project `courtbooking`, linked to github.com/farisrakha/courtbooking; every push to `main` deploys automatically).

There is no test framework. `npm run check` is the only test: plain Node 24 running a `.ts` file (type stripping), which is why `tsconfig.json` sets `allowImportingTsExtensions`.

## Next.js 16 with Cache Components

`next.config.ts` turns on `cacheComponents` and `partialPrefetching`. This changes how pages must be written. Check `node_modules/next/dist/docs/` rather than memory:
- Anything that reads `params`, `searchParams`, the current time, or `localStorage` must sit inside `<Suspense>`. Otherwise dev shows the "URL data outside of Suspense" insight or the build fails.
- Browser-only client components start with `use(browser("reason"))` (from `react-dom`, React 19.3) and get a skeleton fallback. `SlotPicker`, `CheckoutForm`, `Confirmation` and `BookingList` all follow this pattern.
- `/venue/[slug]` keeps its back link in the static shell and awaits `params` in a child under Suspense. `dynamicParams` is not allowed. Unknown slugs call `notFound()` inside the boundary.

## Architecture

- `src/lib/venues.ts` is the whole catalog (8 venues incl. Aquatic, Panahan, Panjat Tebing, Mezzanine). Each court has a `tariff` per retail block (`weekday`, optional `weekend`, `peak` from `peakFrom`, `club`); `block` is 2 hours or `"visit"` (day pass); `packages` are Event/Tribun day rentals (12 or 16 h); `rooms` are Mezzanine (UI-08: per-hour rooms on working days, per-day rooms; booked through `RoomPicker` and the retail checkout path with `?room=`). Numbers follow the revision CSV (`Kategori Lapangan dan UI Design Revisi…csv`, LPUK 2026 tariff); everything marked `ponytail: placeholder` is a guess until LPUK sends the official tariff.
- `src/lib/booking.ts` holds pricing and booking rules: `quote()` (retail: fee + voucher), `retailPrice()` (klub > peak > weekend > weekday), `eventQuote()` (rent + `loadingCost()` persiapan/bongkar 50% for 3 days + `TAX_PCT` tax, Lunas or DP 50%, Uang Jaminan 30% info), `settleQuote()` (DP balance). Statuses stored `review|pending|paid|cancelled|expired`; `shownStatus()` adds `dp` (DP paid, balance owed) and `done`. Availability: `isSlotTaken()` (overlapping blocks, event days), `isDayLocked()` (events vs retail clash), demo fakes `isBookedByOthers()` / `isEventDayTaken()` / `isRetailBusyDay()`. Plus `HOLD_MINUTES` (10), `canCancel()` and the `ina-bookings` store.
- `src/lib/auth.ts` is **demo-only** auth in localStorage (`ina-users`, `ina-session`, `ina-login-tries`): register, Google stand-in, login with 5-try/15-min lock, verify and reset tokens shown on screen instead of emailed. Pure rules at the top (`phoneOk`, `normalizePhone`, `passwordOk`, `safeNext`, `failTry`) are covered by `npm run check`. Replace the rest with Clerk (PRD phase 1).
- `src/lib/useStore.ts`: `useUser()` / `useBookings()` subscribe to localStorage via `useSyncExternalStore`, so the header, pages and `/preview` frames update live. Writes go through `storage.ts` `writeJSON()`, which fires the in-tab event.
- Flow: `SlotPicker` (retail) or `EventPicker` (event tab, `?mode=event`) → `/checkout?venue=&court=&date=&hour=&tier=` or `?venue=&pkg=&dates=a,b&pre=&post=` → login gate (`redirect` to `/masuk?next=`; Google sign-ups without a phone go through `/daftar/whatsapp`) → `CheckoutForm` re-validates and saves a `pending` booking with a hold (or `review` for a special-tariff request) → `/booking/[id]/bayar` (countdown, "Saya sudah bayar (demo)"; `?lunasi=1` settles a DP) → `/booking/[id]` (owner only; Lunasi, cancel, rebook, Beri ulasan) → `/bookings` (tabs). Phone screens use `StickyBar` for the summary + main action. Logged-in guards use `redirect()` during render inside the browser-only components.
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
