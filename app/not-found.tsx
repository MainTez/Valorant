import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative z-10 grid min-h-screen place-items-center px-6">
      <div className="surface-accent max-w-md text-center p-10 animate-slide-up">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[color:var(--accent)]" />
        <h1 className="font-display text-3xl">404 · Off the map</h1>
        <p className="mt-2 text-[color:var(--color-muted)]">
          That route is not part of your team hub.
        </p>
        <Link href="/dashboard" className="btn-accent mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
