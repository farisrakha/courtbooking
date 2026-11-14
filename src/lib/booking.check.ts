// Run: node src/lib/booking.check.ts  (Node 24 strips the types)
import assert from "node:assert/strict";
import { quote, isoDate, isBookedByOthers, shownStatus, canCancel, isSlotTaken, nextSameWeekday, type Booking } from "./booking.ts";
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
