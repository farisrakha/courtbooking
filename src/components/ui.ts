import clsx from "clsx";

// Shared atom styles. Use on <button>, <Link> or <a> so we don't need a wrapper per element.
// Red (victory) is reserved for the one primary action on a screen; navy for everything else.
export function btn(variant: "primary" | "navy" | "outline" | "ghost" = "primary", size: "md" | "lg" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-integrity",
    "disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:border-line",
    size === "md" ? "h-10 px-4 text-sm" : "h-12 px-6 text-base",
    variant === "primary" && "bg-victory text-white hover:bg-victory-dark",
    variant === "navy" && "bg-integrity text-white hover:bg-integrity-deep",
    variant === "outline" && "border border-integrity text-integrity hover:bg-integrity-soft",
    variant === "ghost" && "text-integrity hover:bg-integrity-soft",
  );
}

export const card = "rounded-2xl border border-line bg-white";

export const input =
  "h-11 w-full rounded-xl border border-line bg-platinum px-3 text-sm text-ink placeholder:text-muted focus:border-integrity focus:bg-white focus:outline-none focus:ring-2 focus:ring-integrity/20";

export const label = "mb-1.5 block text-sm font-medium text-ink";

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em]";
