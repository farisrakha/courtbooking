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
- `src/lib/booking.ts` holds all pricing and slot logic: `quote()` (payment fee + voucher, capped), `PAYMENT_METHODS`, `VOUCHERS`, `isBookedByOthers()` (deterministic fake occupancy, about 30%), local-date helpers, and `loadBookings`/`saveBooking` (localStorage key `ina-bookings`).
- How state moves through the flow: a slot is chosen in `SlotPicker`, then passed as a URL (`/checkout?venue=&court=&date=&hour=`). `CheckoutForm` re-validates it (exists, not past, not taken, within 7 days) and saves a `Booking` to localStorage, then goes to `/booking/[id]`. `/bookings` reads the same store. Slots you booked yourself also show as taken in the grid.
- There's no backend, auth or real payment yet. Adding any of them means replacing `isBookedByOthers` and the localStorage functions with a database (use the Vercel Marketplace), and moving booking creation into a server action.

## Styling

- Tailwind v4. Brand tokens live in `src/app/globals.css` `@theme` (`integrity*` navy, `victory*` red, `ink`, `muted`, `line`, `platinum`, `ok*`). There is no `tailwind.config`.
- Shared atom styles are class-string helpers in `src/components/ui.ts` (`btn(variant, size)`, `card`, `input`, `label`), not wrapper components. Use them on `<button>`, `<Link>` or `<a>` directly.
- Red (`btn("primary")`) is for the one main action per screen. Everything else is navy (`navy`/`outline`/`ghost`).
- Grids that contain the slot table need `grid-cols-[minmax(0,1fr)]` on mobile, and `<fieldset>` around horizontal scrollers needs `min-w-0`. Without them the page scrolls sideways at 375px.

## Assets and references

- `public/brand/logo.svg` / `logo-light.svg` and `public/images/venues/*.webp` were downloaded from https://inasports.vercel.app (`/images/venues/<name>.webp`). Fetch new court photos from there and don't hotlink.
- UX reference: Figma Make file "Sport venue booking app (Community)" (`C9gF8KMnziclcuBt5mbBUj`). The Figma MCP has no access to it, so open it in Chrome to check the flow.
