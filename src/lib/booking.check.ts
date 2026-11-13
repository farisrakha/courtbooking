// Run: node src/lib/booking.check.ts  (Node 24 strips the types)
import assert from "node:assert/strict";
import { quote, isoDate, isBookedByOthers } from "./booking.ts";

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

console.log("booking.check: ok");
