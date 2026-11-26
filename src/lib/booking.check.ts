// Run: node src/lib/booking.check.ts  (Node 24 strips the types)
import assert from "node:assert/strict";
import {
  quote, isoDate, isBookedByOthers, shownStatus, canCancel, isSlotTaken, nextSameWeekday, retailPrice, blockHours,
  isEventDayTaken, isDayLocked, eventQuote, isRetailBusyDay, loadingCost, balanceDue, settleQuote, isActive,
  isHoliday, roomPrice, roomOpenOn, isRoomTaken,
  type Booking,
} from "./booking.ts";
import { getVenue, fromPrice } from "./venues.ts";
import { normalizePhone, displayPhone, phoneOk, passwordOk, safeNext, failTry, LOCK_MS } from "./auth.ts";

// Same case as the Figma prototype: 125.000, QRIS, INASPORT10 -> save 12.500.
assert.deepEqual(quote(125_000, "qris", "INASPORT10"), { subtotal: 125_000, fee: 0, discount: 12_500, total: 112_500 });
// Voucher caps at 15.000; code is case-insensitive.
assert.equal(quote(450_000, "qris", " inasport10 ").discount, 15_000);
// Flat VA fee, unknown voucher ignored.
assert.deepEqual(quote(60_000, "bca", "NOPE"), { subtotal: 60_000, fee: 6_000, discount: 0, total: 66_000 });
// Card: 2.9% + 2.000.
assert.equal(quote(100_000, "card").fee, 4_900);
// Local date, not UTC.
assert.equal(isoDate(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
// Fake occupancy is stable.
assert.equal(isBookedByOthers("a", "b", "2026-01-01", 9), isBookedByOthers("a", "b", "2026-01-01", 9));


// Booking statuses (PRD F4/F6). A booking for Sat 14 Nov 2026, 09:00.
const b: Booking = {
  id: "INA-T", userEmail: "a@b.c", status: "pending", venueSlug: "x", courtId: "c", date: "2026-11-14", hour: 9,
  name: "A", email: "a@b.c", phone: "+628", method: "qris", subtotal: 1, fee: 0, discount: 0, total: 1,
  createdAt: "", holdExpiresAt: new Date(2026, 10, 13, 12, 10).toISOString(),
};
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
assert.equal(shownStatus(b, at(13, 12, 5)), "pending");
assert.equal(shownStatus(b, at(13, 12, 10)), "expired"); // hold ran out
assert.equal(shownStatus({ ...b, status: "paid" }, at(14, 9, 59)), "paid");
assert.equal(shownStatus({ ...b, status: "paid" }, at(14, 10)), "done"); // hour is over
assert.equal(shownStatus({ ...b, status: undefined }, at(13, 0)), "paid"); // v1 booking
assert.equal(canCancel({ ...b, status: "paid" }, at(14, 7)), true); // exactly 2 h before
assert.equal(canCancel({ ...b, status: "paid" }, at(14, 7, 1)), false);
assert.equal(canCancel({ ...b, status: "cancelled" }, at(13, 0)), false);
// Slot taken by an active hold, freed once it expires.
const free = ["x", "c", "2026-11-14"] as const;
const h = [...Array(24).keys()].find((n) => !isBookedByOthers(...free, n))!;
const hold = { ...b, hour: h };
assert.equal(isSlotTaken(...free, h, [hold], at(13, 12, 5)), true);
assert.equal(isSlotTaken(...free, h, [hold], at(13, 12, 11)), false);
// "Pesan lagi" lands on the same weekday within the 7-day window.
assert.equal(nextSameWeekday("2026-11-07", at(13, 8)), "2026-11-14"); // Sat -> next Sat

// LPUK tariffs (UI-04/05). 2026-11-14 is a Saturday, 2026-11-16 a Monday.
const tenis = getVenue("tenis-senayan")!, gor = getVenue("gor-popki-cibubur")!, aq = getVenue("aquatic-cibubur")!;
assert.equal(retailPrice(tenis, tenis.courts[0], "2026-11-16", 8), 300_000);
assert.equal(retailPrice(tenis, tenis.courts[0], "2026-11-14", 8), 350_000); // weekend
assert.equal(retailPrice(gor, gor.courts[0], "2026-11-16", 14), 500_000); // non-peak
assert.equal(retailPrice(gor, gor.courts[0], "2026-11-14", 16), 800_000); // peak
assert.equal(retailPrice(aq, aq.courts[0], "2026-11-16", 8, "perorangan"), 60_000);
assert.equal(retailPrice(aq, aq.courts[0], "2026-11-16", 8, "klub"), 750_000);
assert.deepEqual(blockHours(tenis), [6, 8, 10, 12, 14, 16, 18, 20]);
assert.deepEqual(blockHours(getVenue("panjat-tebing-cibubur")!), [8]); // one visit per day
assert.equal(fromPrice(gor, "event").unit, "Hari (16 Jam)");
assert.equal(fromPrice(aq, "retail").unit, "2 Jam");

// 2-hour blocks overlap old 1-hour bookings; perorangan tickets don't block.
const day = "2026-11-16";
const blk = [6, 8, 10, 12, 14, 16, 18].find((n) => !isBookedByOthers("tenis-senayan", "t1", day, n) && !isEventDayTaken("tenis-senayan", day))!;
const r1: Booking = { ...b, status: "paid", venueSlug: "tenis-senayan", courtId: "t1", date: day, hour: blk + 1 };
assert.equal(isSlotTaken("tenis-senayan", "t1", day, blk, [r1], at(13, 0), 2), true);
assert.equal(isSlotTaken("tenis-senayan", "t1", day, blk, [{ ...r1, tier: "perorangan" }], at(13, 0), 2), false);

// Event day lock both ways (UI-06): retail booking locks the day; event booking fills every retail slot.
const evDay = [...Array(60).keys()].map((k) => isoDate(new Date(2026, 11, 1 + k))).find((d) => !isEventDayTaken("gor-popki-cibubur", d) && !isRetailBusyDay("gor-popki-cibubur", d))!;
const retail: Booking = { ...b, status: "paid", venueSlug: "gor-popki-cibubur", courtId: "g1", date: evDay, hour: 8, hours: 2 };
assert.equal(isDayLocked("gor-popki-cibubur", evDay, [], at(13, 0)), false);
assert.equal(isDayLocked("gor-popki-cibubur", evDay, [retail], at(13, 0)), true);
const ev: Booking = { ...retail, type: "Event", pkg: "event-16", courtId: "all", hour: 6, hours: 16, dates: ["2026-11-30", evDay] };
assert.equal(isSlotTaken("gor-popki-cibubur", "g1", evDay, 20, [ev], at(13, 0), 2), true);
assert.equal(shownStatus(ev, new Date(2026, 10, 30, 23)), "paid"); // day 1 is over, but it runs until the last day ends
// Event quote (UI-09): 2 days × 12 jt + 10% tax = 26,4 jt; DP 50% = 13,2 jt; VA fee on what's paid now.
const q = eventQuote(12_000_000, 2, "dp", "bca");
assert.deepEqual(q, { subtotal: 24_000_000, loading: 0, tax: 2_400_000, fee: 6_000, discount: 0, total: 26_406_000, dueNow: 13_206_000, deposit: 7_200_000 });
assert.equal(eventQuote(12_000_000, 1, "lunas", "card").fee, Math.round(13_200_000 * 0.029) + 2_000);

// UI-07: persiapan & bongkar. Up to 3 days at 50%, beyond that 100%; taxed with the rent.
assert.equal(loadingCost(12_000_000, 2), 12_000_000);
assert.equal(loadingCost(12_000_000, 4), 18_000_000 + 12_000_000);
assert.equal(eventQuote(12_000_000, 1, "lunas", "qris", 1).tax, 1_800_000); // (12 + 6) jt × 10%
const evLoad: Booking = { ...ev, loadDates: ["2026-11-29"] };
assert.equal(isSlotTaken("gor-popki-cibubur", "g1", "2026-11-29", 8, [evLoad], at(13, 0), 2), true); // loading day locks retail

// Retail busy days (demo) lock events; they never overlap fake event days.
for (const d of [...Array(60).keys()].map((k) => isoDate(new Date(2026, 11, 1 + k)))) {
  assert.ok(!(isRetailBusyDay("gor-popki-cibubur", d) && isEventDayTaken("gor-popki-cibubur", d)));
  if (isRetailBusyDay("gor-popki-cibubur", d)) assert.equal(isDayLocked("gor-popki-cibubur", d, [], at(13, 0)), true);
}

// DP status and settlement (UI-11): "DP dibayar" until the balance is paid, then "Lunas".
const dp: Booking = { ...ev, scheme: "dp", method: "bca", total: 26_406_000, paidAmount: 13_206_000 };
assert.equal(shownStatus(dp, at(13, 0)), "dp");
assert.equal(balanceDue(dp), 13_200_000);
assert.deepEqual(settleQuote(dp), { remaining: 13_200_000, fee: 6_000, amount: 13_206_000 });
assert.equal(shownStatus({ ...dp, paidAmount: dp.total }, at(13, 0)), "paid");
assert.equal(balanceDue({ ...dp, status: "pending" }), 0); // nothing owed before the DP is paid
// UI-10: a special-tariff request holds the dates while the admin reviews it.
assert.equal(shownStatus({ ...ev, status: "review" }, at(13, 0)), "review");
assert.equal(isActive({ ...ev, status: "review" }, at(13, 0)), true);
// Panahan's 12-hour package fits its opening hours.
const pan = getVenue("panahan-cibubur")!;
assert.ok(pan.close - pan.open >= pan.packages![0].hours);

// UI-05: national holidays use the weekend ("Libur") tariff. 25 Dec 2026 is a Friday.
assert.equal(isHoliday("2026-12-25"), true);
assert.equal(retailPrice(tenis, tenis.courts[0], "2026-12-25", 8), 350_000);
assert.equal(retailPrice(tenis, tenis.courts[0], "2026-12-24", 8), 300_000);

// UI-08 Mezzanine: per-hour rooms × hours on working days only; per-day rooms one price.
const mz = getVenue("mezzanine-gor-utara")!;
const ruangA = mz.rooms!.find((r) => r.id === "ra")!, kelas1 = mz.rooms!.find((r) => r.id === "k1")!;
assert.equal(roomPrice(ruangA, 3), 300_000);
assert.equal(roomPrice(kelas1, 9), 7_400_000);
assert.equal(roomOpenOn(ruangA, "2026-11-14"), false); // Saturday
assert.equal(roomOpenOn(ruangA, "2026-12-25"), false); // holiday
assert.equal(roomOpenOn(kelas1, "2026-11-14"), true);
const rDay = "2026-11-16";
const rHour = [8, 9, 10, 11, 12, 13, 14].find((h) => !isRoomTaken(mz.slug, ruangA, rDay, h, 2, [], at(13, 0)))!;
const roomBk: Booking = { ...b, status: "paid", type: "Ruangan", venueSlug: mz.slug, courtId: "ra", date: rDay, hour: rHour, hours: 2 };
assert.equal(isRoomTaken(mz.slug, ruangA, rDay, rHour + 1, 1, [roomBk], at(13, 0)), true); // overlaps
assert.equal(isRoomTaken(mz.slug, ruangA, rDay, rHour + 2, 1, [roomBk], at(13, 0)), isRoomTaken(mz.slug, ruangA, rDay, rHour + 2, 1, [], at(13, 0))); // adjacent is free of it
assert.equal(isActive(roomBk, at(13, 0)), true);

// Auth rules (PRD F1/F2).
assert.equal(normalizePhone("0812-3456 7890"), "+6281234567890");
assert.equal(normalizePhone("6281234567"), "+6281234567");
assert.equal(displayPhone("+6281234567"), "081234567");
assert.equal(phoneOk("081200000000"), true);
assert.equal(phoneOk("0212345678"), false); // landline
assert.equal(passwordOk("TestPass123"), true);
assert.equal(passwordOk("onlyletters"), false);
assert.equal(passwordOk("short1"), false);
assert.equal(safeNext("/checkout?venue=a"), "/checkout?venue=a");
assert.equal(safeNext("//evil.com"), "/");
assert.equal(safeNext("https://evil.com"), "/");
let t = failTry(undefined, 0);
for (let i = 1; i < 5; i++) t = failTry(t, i * 1000);
assert.ok(t.lockedUntil === 4000 + LOCK_MS); // 5th wrong try locks for 15 min
assert.equal(failTry(t, LOCK_MS + 10).count, 1); // window resets after 15 min

console.log("booking.check: ok");
