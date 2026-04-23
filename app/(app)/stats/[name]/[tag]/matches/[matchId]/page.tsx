import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { henrikAccount, henrikMatches } from "@/lib/henrik/client";
import { normalizeAccount, normalizeMatches } from "@/lib/henrik/normalize";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import { getAgentAsset, getMapAsset } from "@/lib/valorant/assets";
import { EmptyState } from "@/components/common/empty-state";
import type { NormalizedAccount } from "@/types/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ name: string; tag: string; matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface RawPlayer {
  puuid?: string | null;
  name?: string | null;
  tag?: string | null;
  team?: string | null;
  character?: string | null;
  currenttier_patched?: string | null;
  stats?: {
    score?: number | null;
    kills?: number | null;
    deaths?: number | null;
    assists?: number | null;
  } | null;
}

interface MatchRaw {
  metadata?: {
    map?: string | null;
    mode?: string | null;
    queue?: string | null;
    game_start_patched?: string | null;
    game_length?: number | null;
  } | null;
  players?: {
    all_players?: RawPlayer[] | null;
    red?: RawPlayer[] | null;
    blue?: RawPlayer[] | null;
  } | null;
}

export async function generateMetadata({ params }: Props) {
  const { name, tag } = await params;
  return { title: `Match | ${decodeURIComponent(name)}#${decodeURIComponent(tag)}` };
}

export default async function PlayerMatchDetailPage({ params, searchParams }: Props) {
  await requireSession();
  const { name, tag, matchId } = await params;
  const sp = await searchParams;
  const region = normalizeRegion(typeof sp.region === "string" ? sp.region : defaultRegion());

  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);
  const decodedMatchId = decodeURIComponent(matchId);

  let accountRes;
  let matchesRes;
  try {
    [accountRes, matchesRes] = await Promise.all([
      henrikAccount(decodedName, decodedTag),
      henrikMatches(decodedName, decodedTag, region, { size: 20 }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Henrik API error";
    return (
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="surface p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <h2 className="mt-3 font-display text-2xl tracking-wide">Could not load match</h2>
          <p className="mt-2 text-[color:var(--color-muted)]">{message}</p>
          <Link
            href={`/stats/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
            className="btn-ghost mt-6 inline-flex"
          >
            Back to player
          </Link>
        </div>
      </div>
    );
  }

  const account = normalizeAccount(accountRes);
  if (!account) {
    return (
      <div className="mx-auto mt-8 max-w-2xl">
        <EmptyState
          title="Player not found"
          description={`No Riot account for ${decodedName}#${decodedTag} in ${region.toUpperCase()}.`}
          action={
            <Link href="/stats" className="btn-ghost">
              Back to search
            </Link>
          }
        />
      </div>
    );
  }

  const matches = normalizeMatches(matchesRes, {
    puuid: account.puuid,
    name: decodedName,
    tag: decodedTag,
  });
  const match = matches.find((entry) => entry.matchId === decodedMatchId);

  if (!match) {
    return (
      <div className="mx-auto mt-8 max-w-2xl">
        <EmptyState
          title="Match not available"
          description="This match is not in the current Henrik match window. We currently load the latest 20 matches for the tracker."
          action={
            <Link
              href={`/stats/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
              className="btn-ghost"
            >
              Back to player
            </Link>
          }
        />
      </div>
    );
  }

  const raw = asMatchRaw(match.raw);
  const players = getRawPlayers(raw);
  const currentPlayer = findCurrentPlayer(players, account);
  const currentTeam = (currentPlayer?.team ?? "").toLowerCase();
  const teammates = players.filter((player) => (player.team ?? "").toLowerCase() === currentTeam);
  const opponents = players.filter((player) => (player.team ?? "").toLowerCase() !== currentTeam);
  const mapAsset = getMapAsset(match.map);

  return (
    <div className="flex max-w-[1400px] flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Match Detail</div>
          <Link
            href={`/stats/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
            className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted)] hover:accent-text"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to player
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-[#d6a74a]/12 bg-[linear-gradient(180deg,rgba(18,16,14,0.98)_0%,rgba(10,12,17,0.99)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {mapAsset?.splash ? (
          <>
            <Image
              src={mapAsset.splash}
              alt={match.map}
              fill
              sizes="100vw"
              className="object-cover object-center opacity-20"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,14,0.96)_0%,rgba(7,9,14,0.82)_45%,rgba(7,9,14,0.95)_100%)]" />
          </>
        ) : null}
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#d6a74a]/20 bg-[#d6a74a]/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#f0c462]">
                {match.map}
              </span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                {match.mode}
              </span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                {formatStartedAt(raw.metadata?.game_start_patched ?? match.startedAt)}
              </span>
            </div>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,4.4rem)] leading-[0.92] tracking-tight text-white">
              {match.result === "win" ? "Victory" : match.result === "loss" ? "Defeat" : "Draw"}
            </h1>
            <div className="mt-3 font-display text-4xl text-[#f0c462]">
              {match.scoreTeam} - {match.scoreOpponent}
            </div>
            <p className="mt-4 max-w-[38rem] text-sm leading-7 text-white/62">
              Henrik is already giving enough data for a usable match view: roster, scoreline, personal stat line, and the raw match payload for deeper expansion later.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricBox label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
            <MetricBox label="ACS" value={String(match.acs)} />
            <MetricBox label="ADR" value={String(match.adr)} />
            <MetricBox label="HS%" value={`${match.headshotPct.toFixed(0)}%`} />
            <MetricBox label="Rank After" value={match.rankAfter ?? "Unknown"} />
            <MetricBox label="Length" value={formatDuration(raw.metadata?.game_length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <RosterPanel
          title="Your Team"
          players={teammates}
          account={account}
        />
        <RosterPanel
          title="Opponents"
          players={opponents}
          account={account}
        />
      </section>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#d6a74a]/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/38">{label}</div>
      <div className="mt-2 font-display text-3xl leading-none text-white">{value}</div>
    </div>
  );
}

function RosterPanel({
  title,
  players,
  account,
}: {
  title: string;
  players: RawPlayer[];
  account: NormalizedAccount;
}) {
  return (
    <section className="rounded-[24px] border border-[#d6a74a]/12 bg-[linear-gradient(180deg,rgba(18,16,14,0.98)_0%,rgba(10,12,17,0.99)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="font-display text-3xl leading-none text-white">{title}</div>
      <div className="mt-4 space-y-3">
        {players.length === 0 ? (
          <p className="rounded-2xl border border-[#d6a74a]/10 bg-white/[0.025] px-4 py-5 text-sm text-white/55">
            No roster data available from this Henrik payload.
          </p>
        ) : (
          players.map((player) => {
            const asset = getAgentAsset(player.character ?? undefined);
            const isCurrent =
              player.puuid === account.puuid ||
              `${player.name ?? ""}#${player.tag ?? ""}`.toLowerCase() ===
                `${account.name}#${account.tag}`.toLowerCase();

            return (
              <div
                key={`${player.puuid ?? player.name ?? "player"}-${player.tag ?? ""}`}
                className={`flex items-center gap-4 rounded-[20px] border p-4 ${
                  isCurrent
                    ? "border-[#d6a74a]/26 bg-[#d6a74a]/[0.06]"
                    : "border-white/8 bg-white/[0.03]"
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(37,44,56,0.9)_0%,rgba(12,16,24,0.98)_100%)]">
                  {asset?.portrait ? (
                    <Image
                      src={asset.portrait}
                      alt={player.character ?? "Agent"}
                      fill
                      sizes="56px"
                      className="object-cover object-top"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-2xl leading-none text-white">
                    {player.name}
                    <span className="text-white/36"> #{player.tag}</span>
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/38">
                    {player.character ?? "Unknown Agent"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right">
                  <RosterStat label="K" value={fmtInt(player.stats?.kills)} />
                  <RosterStat label="D" value={fmtInt(player.stats?.deaths)} />
                  <RosterStat label="A" value={fmtInt(player.stats?.assists)} />
                  <RosterStat label="Score" value={fmtInt(player.stats?.score)} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function RosterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  );
}

function asMatchRaw(raw: unknown): MatchRaw {
  if (typeof raw === "object" && raw !== null) {
    return raw as MatchRaw;
  }
  return {};
}

function getRawPlayers(raw: MatchRaw): RawPlayer[] {
  if (Array.isArray(raw.players?.all_players)) return raw.players.all_players;
  const red = Array.isArray(raw.players?.red) ? raw.players.red : [];
  const blue = Array.isArray(raw.players?.blue) ? raw.players.blue : [];
  return [...red, ...blue];
}

function findCurrentPlayer(players: RawPlayer[], account: NormalizedAccount) {
  return (
    players.find((player) => {
      if (account.puuid && player.puuid === account.puuid) return true;
      return (
        typeof player.name === "string" &&
        typeof player.tag === "string" &&
        player.name.toLowerCase() === account.name.toLowerCase() &&
        player.tag.toLowerCase() === account.tag.toLowerCase()
      );
    }) ?? null
  );
}

function fmtInt(value: number | null | undefined) {
  return typeof value === "number" ? String(Math.round(value)) : "—";
}

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "Unknown";
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatStartedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
