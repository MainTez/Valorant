import Link from "next/link";
import { requireSession } from "@/lib/auth/get-session";
import { MatchEntryForm } from "@/components/matches/match-entry-form";

export const metadata = { title: "Log Match" };

export default async function NewMatchPage() {
  await requireSession();
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <Link href="/matches" className="text-sm text-[color:var(--color-muted)] hover:accent-text">
          ← Back to match log
        </Link>
        <div className="eyebrow mt-2">Match Log</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">Log a match</h1>
      </header>
      <MatchEntryForm />
    </div>
  );
}
