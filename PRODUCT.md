# INA Sports: Booking Lapangan

## Who it's for
Players and amateur teams in Jakarta who want an hour on a court at a state-run venue (Senayan, Cibubur). Usually on a phone, often booking for tonight or this weekend, and comparing price and free hours at a glance.

## What they must be able to do
1. Find a court by sport and location.
2. See which hours are free on which court, for today and the next 6 days.
3. Pay in a way that's normal in Indonesia (QRIS, e-wallet, bank VA, card) and get a booking code to show at the desk.
4. Find their bookings again.

## Journey (copied from the Figma Make "Sport venue booking app" prototype)
Beranda (hero carousel per sport + search card + venue grid) → Detail venue (date strip + court × hour grid, one 1-hour slot, live summary) → Pembayaran (player details, payment method, voucher, cost breakdown, "Bayar Rp X") → Booking berhasil (booking code, details, receipt) → Booking Saya.

## How it should feel
Official but welcoming, like inasports.vercel.app: navy confidence and red energy. Copy is plain, friendly Indonesian ("kamu"), never bureaucratic.

## Brand (from inasports.vercel.app)
- Navy `#212163` (integrity) is primary: headings, selected states, secondary buttons. Deep navy `#14143f` for the footer and hero overlay.
- Red `#d60000` (victory) is only for the single primary action on a screen and small accents.
- Platinum `#f3f3f3` surfaces, DM Sans, radii 8/12/16px.
- Logos and venue photos are the official INA Sports assets in `public/`.

## Not this
Generic green "sports app" look (the Figma prototype's emerald is replaced by the INA palette). No fake ratings or reviews.

## Accessibility bar
WCAG 2.1 AA: contrast, keyboard use of the slot grid, labels on icon buttons, no horizontal page scroll at 375px.
