import type { Metadata } from "next";
import { PreviewFrames } from "@/components/PreviewFrames";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

// Review tool: any page at desktop and phone width, side by side, each scrolling on its own.
// ponytail: fixed 50% scale for the desktop frame; good on a laptop/monitor, scrolls sideways on small screens.
export default function PreviewPage() {
  return (
    <div className="flex-1 bg-muted px-6 py-6">
      <PreviewFrames />
    </div>
  );
}
