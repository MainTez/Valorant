"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="relative z-10 grid min-h-screen place-items-center px-6">
      <div className="surface max-w-md p-10 text-center animate-slide-up">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[color:var(--color-danger)]" />
        <h1 className="font-display text-2xl">Something broke</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          {error.message || "Unexpected error. Try again."}
        </p>
        <button onClick={reset} className="btn-accent mt-6">
          Retry
        </button>
      </div>
    </main>
  );
}
