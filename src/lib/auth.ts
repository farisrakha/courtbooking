// Demo accounts for the PRD flows F1 (register), F2 (login) and F7 (profile).
// ponytail: demo-only auth in localStorage, passwords as unsalted SHA-256. Never ship this;
// replace the whole file with Clerk (PRD phase 1). The pure rules at the top are kept.
import { readJSON, writeJSON } from "./storage.ts";

export type User = {
  email: string;
  name: string;
  phone: string; // stored as +628…, "" until a Google user adds it
  team?: string;
  passwordHash?: string;
  google: boolean;
  verified: boolean;
  verifyToken?: { token: string; expiresAt: number };
  resetToken?: { token: string; expiresAt: number };
  createdAt: string;
};

// ---------- pure rules (covered by booking.check.ts) ----------

export const PHONE_PATTERN = "(\\+62|62|0)8[0-9]{7,12}";
export const phoneOk = (p: string) => new RegExp(`^${PHONE_PATTERN}$`).test(p.replace(/[\s-]/g, ""));

/** 0812…, 62812…, +62812… → +62812… */
export function normalizePhone(p: string) {
  const d = p.replace(/[\s-]/g, "");
  if (d.startsWith("+62")) return d;
  if (d.startsWith("62")) return `+${d}`;
  if (d.startsWith("0")) return `+62${d.slice(1)}`;
  return d;
}

/** For form fields: +62812… → 0812… */
export const displayPhone = (p: string) => (p.startsWith("+62") ? `0${p.slice(3)}` : p);

export const passwordOk = (p: string) => p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p);
export const PASSWORD_HINT = "Minimal 8 karakter, ada huruf dan angka.";

/** Only same-site paths, never `//evil.com` or full URLs. */
export const safeNext = (next: string | null | undefined, fallback = "/") =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;

export const MAX_TRIES = 5;
export const LOCK_MS = 15 * 60_000;
type Tries = { count: number; first: number; lockedUntil?: number };

/** Returns the new attempt record after a failed login at `now`. */
export function failTry(t: Tries | undefined, now: number): Tries {
  const fresh = !t || now - t.first > LOCK_MS;
  const count = fresh ? 1 : t.count + 1;
  return { count, first: fresh ? now : t.first, lockedUntil: count >= MAX_TRIES ? now + LOCK_MS : undefined };
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

// ---------- storage ----------

const USERS = "ina-users";
const SESSION = "ina-session";
const TRIES = "ina-login-tries";

export async function hashPassword(p: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const token = () => crypto.randomUUID().replace(/-/g, "");
const key = (email: string) => email.trim().toLowerCase();

export const loadUsers = () => readJSON<Record<string, User>>(USERS, {});
export const findUser = (email: string) => loadUsers()[key(email)];

function saveUser(u: User) {
  writeJSON(USERS, { ...loadUsers(), [u.email]: u });
}

export function updateUser(email: string, patch: Partial<User>) {
  const u = findUser(email);
  if (u) saveUser({ ...u, ...patch });
}

type Session = { email: string; expiresAt: number };

/** Logged-in user, or null. */
export function currentUser(users = loadUsers(), session = readJSON<Session | null>(SESSION, null)) {
  if (!session || session.expiresAt < Date.now()) return null;
  return users[session.email] ?? null;
}

// ponytail: no sessionStorage split; "Ingat saya" off just means a 12-hour session.
function startSession(email: string, remember = true) {
  writeJSON(SESSION, { email, expiresAt: Date.now() + (remember ? 30 * 24 : 12) * 3_600_000 });
}

export function logout() {
  writeJSON(SESSION, undefined);
}

export async function register(f: { name: string; email: string; phone: string; password: string }) {
  if (findUser(f.email)) return { error: "taken" as const };
  const u: User = {
    email: key(f.email),
    name: f.name.trim(),
    phone: normalizePhone(f.phone),
    passwordHash: await hashPassword(f.password),
    google: false,
    verified: false,
    verifyToken: { token: token(), expiresAt: Date.now() + 24 * 3_600_000 },
    createdAt: new Date().toISOString(),
  };
  saveUser(u);
  startSession(u.email);
  return { ok: true as const };
}

/** Demo stand-in for Google one-tap. A password account must confirm its password once to link. */
export async function googleSignIn(email: string, name: string, password?: string) {
  const u = findUser(email);
  if (!u) {
    saveUser({ email: key(email), name: name.trim() || email.split("@")[0], phone: "", google: true, verified: true, createdAt: new Date().toISOString() });
    startSession(key(email));
    return { ok: true as const, isNew: true };
  }
  if (!u.google) {
    if (!password) return { error: "needs-password" as const };
    if ((await hashPassword(password)) !== u.passwordHash) return { error: "wrong" as const };
    saveUser({ ...u, google: true, verified: true });
  }
  startSession(u.email);
  return { ok: true as const, isNew: false };
}

export async function login(email: string, password: string, remember: boolean) {
  const k = key(email);
  const all = readJSON<Record<string, Tries>>(TRIES, {});
  const now = Date.now();
  if ((all[k]?.lockedUntil ?? 0) > now) return { error: "locked" as const, until: all[k].lockedUntil! };

  const u = findUser(k);
  if (u?.google && !u.passwordHash) return { error: "google-only" as const };
  if (!u || (await hashPassword(password)) !== u.passwordHash) {
    const t = failTry(all[k], now);
    writeJSON(TRIES, { ...all, [k]: t });
    return t.lockedUntil ? { error: "locked" as const, until: t.lockedUntil } : { error: "wrong" as const };
  }
  delete all[k];
  writeJSON(TRIES, all);
  startSession(k, remember);
  return { ok: true as const };
}

/** New verification link; null if asked again within 60 s. */
export function resendVerify(email: string) {
  const u = findUser(email);
  if (!u) return null;
  const sentAt = (u.verifyToken?.expiresAt ?? 0) - 24 * 3_600_000;
  if (Date.now() - sentAt < 60_000) return null;
  const verifyToken = { token: token(), expiresAt: Date.now() + 24 * 3_600_000 };
  saveUser({ ...u, verifyToken });
  return verifyToken.token;
}

/** The account a verification link belongs to, if the link is still valid. */
export function verifyTokenOwner(t: string) {
  const u = Object.values(loadUsers()).find((x) => x.verifyToken?.token === t);
  return u && u.verifyToken!.expiresAt > Date.now() ? u : null;
}

export function verifyEmail(t: string) {
  const u = Object.values(loadUsers()).find((x) => x.verifyToken?.token === t);
  if (!u || u.verifyToken!.expiresAt < Date.now()) return false;
  // Token kept until it expires so opening the link twice still says "verified".
  if (!u.verified) saveUser({ ...u, verified: true });
  return true;
}

/** Always "sent" to the caller (no account enumeration); returns the token for the demo link. */
export function requestReset(email: string) {
  const u = findUser(email);
  if (!u) return null;
  const resetToken = { token: token(), expiresAt: Date.now() + 3_600_000 };
  saveUser({ ...u, resetToken });
  return resetToken.token;
}

export async function resetPassword(t: string, password: string) {
  const u = Object.values(loadUsers()).find((x) => x.resetToken?.token === t);
  if (!u || u.resetToken!.expiresAt < Date.now()) return false;
  saveUser({ ...u, passwordHash: await hashPassword(password), resetToken: undefined, verified: true });
  startSession(u.email);
  return true;
}

export async function changePassword(email: string, current: string, next: string) {
  const u = findUser(email);
  if (!u) return false;
  if (u.passwordHash && (await hashPassword(current)) !== u.passwordHash) return false;
  saveUser({ ...u, passwordHash: await hashPassword(next) });
  return true;
}

// Call booking.ts forgetUser() too, so the account's bookings are unlinked.
export function deleteAccount(email: string) {
  const users = loadUsers();
  delete users[key(email)];
  writeJSON(USERS, users);
  logout();
}
