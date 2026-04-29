import { OverlayClient } from "@/components/desktop/overlay-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desktop Overlay" };

export default function DesktopOverlayPage() {
  return <OverlayClient />;
}
