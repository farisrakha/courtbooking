/** UI-12: phone-only bottom bar with the live summary and the main action. globals.css pads the page while it shows. */
export function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card px-4 py-3 shadow-[0_-8px_24px_-12px] shadow-integrity/20 sm:hidden">
        {children}
      </div>
    </>
  );
}
