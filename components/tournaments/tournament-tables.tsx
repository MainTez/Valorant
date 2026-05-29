"use client";

import { useState, type KeyboardEvent } from "react";
import { BarChart3, ChevronDown, Table2 } from "lucide-react";
import {
  groupStandingRows,
  isStandingGroupOpenByDefault,
} from "@/lib/ggarena/standings";
import { Badge } from "@/components/ui/badge";
import {
  findTournamentStatPlayerByKey,
  findTournamentStatTeamByKey,
  findTournamentStatTeamForStanding,
  getDefaultTournamentStatSelection,
  getTournamentStatPlayerKey,
  getTournamentStatTeamKey,
  groupTournamentStatsByTeam,
  type TournamentStatGroup,
  type TournamentStatTeam,
} from "@/lib/ggarena/tournament-stats";
import type {
  GGArenaStandingRow,
  GGArenaStatRow,
} from "@/lib/ggarena/normalize";

interface TournamentTablesProps {
  standings: GGArenaStandingRow[];
  stats: GGArenaStatRow[];
}

export function TournamentTables({ standings, stats }: TournamentTablesProps) {
  const statGroups = groupTournamentStatsByTeam(stats, standings);
  const defaultSelection = getDefaultTournamentStatSelection(statGroups);
  const [selectedTeamKey, setSelectedTeamKey] = useState<string | null>(
    defaultSelection.teamKey,
  );
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(
    defaultSelection.playerKey,
  );
  const [openStatScopes, setOpenStatScopes] = useState<Set<string>>(() => {
    const defaultTeam = findTournamentStatTeamByKey(statGroups, defaultSelection.teamKey);
    return defaultTeam ? new Set([defaultTeam.scope]) : new Set();
  });

  const activeTeam = findTournamentStatTeamByKey(statGroups, selectedTeamKey);
  const activePlayer =
    findTournamentStatPlayerByKey(activeTeam, selectedPlayerKey) ??
    activeTeam?.players[0] ??
    null;
  const activeTeamKey = getTournamentStatTeamKey(activeTeam);
  const activePlayerKey = getTournamentStatPlayerKey(activePlayer);

  function selectTeam(team: TournamentStatTeam) {
    setSelectedTeamKey(getTournamentStatTeamKey(team));
    setSelectedPlayerKey(getTournamentStatPlayerKey(team.players[0]));
    setOpenStatScopes((current) => new Set(current).add(team.scope));
  }

  function selectStanding(row: GGArenaStandingRow) {
    const matchingTeam = findTournamentStatTeamForStanding(row, statGroups);
    if (matchingTeam) selectTeam(matchingTeam);
  }

  function selectPlayer(row: GGArenaStatRow) {
    setSelectedPlayerKey(getTournamentStatPlayerKey(row));
  }

  function toggleStatScope(scope: string) {
    setOpenStatScopes((current) => {
      const next = new Set(current);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  }

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <StandingsTable
        activeTeamKey={activeTeamKey}
        rows={standings}
        statGroups={statGroups}
        onSelectTeam={selectStanding}
      />
      <StatsTable
        activePlayerKey={activePlayerKey}
        activePlayer={activePlayer}
        activeTeam={activeTeam}
        activeTeamKey={activeTeamKey}
        groups={statGroups}
        openScopes={openStatScopes}
        onSelectPlayer={selectPlayer}
        onSelectTeam={selectTeam}
        onToggleScope={toggleStatScope}
      />
    </section>
  );
}

function StandingsTable({
  activeTeamKey,
  rows,
  statGroups,
  onSelectTeam,
}: {
  activeTeamKey: string | null;
  rows: GGArenaStandingRow[];
  statGroups: TournamentStatGroup[];
  onSelectTeam: (row: GGArenaStandingRow) => void;
}) {
  const groups = groupStandingRows(rows);

  function selectRowFromKeyboard(
    event: KeyboardEvent<HTMLTableRowElement>,
    row: GGArenaStandingRow,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectTeam(row);
  }

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 p-5">
        <div>
          <div className="eyebrow">Standings</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Sorted highest to lowest points per division
          </div>
        </div>
        <Table2 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {groups.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[color:var(--color-muted)]">
          No standings returned.
        </div>
      ) : (
        <div className="divide-y divide-white/7">
          {groups.map((group) => {
            const surfRow = group.rows.find((row) => row.isSurfBulls) ?? null;
            return (
              <details
                key={group.scope}
                className="group"
                open={isStandingGroupOpenByDefault(group, groups.length)}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg tracking-wide">
                        {group.scope}
                      </span>
                      {surfRow ? <Badge>Surf division</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                      {group.rows.length} teams
                      {surfRow ? ` · Surf'n Bulls ${formatStandingDetail(surfRow)}` : ""}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--color-muted)] transition group-open:rotate-180" />
                </summary>
                <div className="overflow-x-auto border-t border-white/7">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                      <tr className="border-b border-white/7">
                        <th className="px-5 py-3">Team</th>
                        <th className="px-3 py-3 text-right">P</th>
                        <th className="px-3 py-3 text-right">W</th>
                        <th className="px-3 py-3 text-right">D</th>
                        <th className="px-3 py-3 text-right">L</th>
                        <th className="px-5 py-3 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const matchingTeam = findTournamentStatTeamForStanding(row, statGroups);
                        const isActive =
                          matchingTeam !== null &&
                          getTournamentStatTeamKey(matchingTeam) === activeTeamKey;
                        return (
                          <tr
                            key={`${group.scope}-${row.id ?? row.name}-${row.rank ?? ""}`}
                            role="button"
                            tabIndex={0}
                            title={`Show tournament stats for ${row.name}`}
                            className={
                              isActive
                                ? "cursor-pointer border-b border-white/6 bg-white/[0.05] transition hover:bg-white/[0.07]"
                                : row.isSurfBulls
                                  ? "cursor-pointer border-b border-white/6 bg-[color:var(--accent-dim)] transition hover:bg-[color:var(--accent-dim)]"
                                  : "cursor-pointer border-b border-white/6 transition hover:bg-white/[0.03]"
                            }
                            onClick={() => onSelectTeam(row)}
                            onKeyDown={(event) => selectRowFromKeyboard(event, row)}
                          >
                            <td className="px-5 py-3">
                              <span
                                className={
                                  isActive
                                    ? "font-display tracking-wide text-[color:var(--accent)]"
                                    : "font-display tracking-wide"
                                }
                              >
                                {row.rank ? `${row.rank}. ` : ""}
                                {row.name}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">{formatNumber(row.played)}</td>
                            <td className="px-3 py-3 text-right">{formatNumber(row.wins)}</td>
                            <td className="px-3 py-3 text-right">{formatNumber(row.draws)}</td>
                            <td className="px-3 py-3 text-right">{formatNumber(row.losses)}</td>
                            <td className="px-5 py-3 text-right font-semibold">
                              {formatNumber(row.points)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsTable({
  activePlayerKey,
  activePlayer,
  activeTeam,
  activeTeamKey,
  groups,
  openScopes,
  onSelectPlayer,
  onSelectTeam,
  onToggleScope,
}: {
  activePlayerKey: string | null;
  activePlayer: GGArenaStatRow | null;
  activeTeam: TournamentStatTeam | null;
  activeTeamKey: string | null;
  groups: TournamentStatGroup[];
  openScopes: Set<string>;
  onSelectPlayer: (row: GGArenaStatRow) => void;
  onSelectTeam: (team: TournamentStatTeam) => void;
  onToggleScope: (scope: string) => void;
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 p-5">
        <div>
          <div className="eyebrow">Tournament Stats</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Choose a division, then a team, then a player
          </div>
        </div>
        <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {groups.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[color:var(--color-muted)]">
          No stat rows returned.
        </div>
      ) : (
        <div className="divide-y divide-white/7">
          {groups.map((group) => {
            const isOpen = openScopes.has(group.scope);
            const selectedInGroup = activeTeam !== null && activeTeam.scope === group.scope;
            const isSurfDivision = group.teams.some((team) => team.isSurfBulls);
            return (
              <div key={group.scope}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                  aria-expanded={isOpen}
                  onClick={() => onToggleScope(group.scope)}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg tracking-wide">
                        {group.scope}
                      </span>
                      {isSurfDivision ? <Badge>Surf division</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                      {group.teams.length} teams
                      {selectedInGroup && activeTeam ? ` · showing ${activeTeam.name}` : ""}
                    </div>
                  </div>
                  <ChevronDown
                    className={
                      isOpen
                        ? "h-4 w-4 shrink-0 rotate-180 text-[color:var(--color-muted)] transition"
                        : "h-4 w-4 shrink-0 text-[color:var(--color-muted)] transition"
                    }
                  />
                </button>
                {isOpen ? (
                  <div className="space-y-4 border-t border-white/7 px-5 pb-5 pt-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.teams.map((team) => {
                        const teamKey = getTournamentStatTeamKey(team);
                        const isActive = teamKey === activeTeamKey;
                        return (
                          <button
                            key={teamKey ?? team.name}
                            type="button"
                            className={
                              isActive
                                ? "rounded-lg border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] px-3 py-2 text-left text-[color:var(--accent)]"
                                : "rounded-lg border border-white/7 bg-white/[0.02] px-3 py-2 text-left transition hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
                            }
                            onClick={() => onSelectTeam(team)}
                          >
                            <span className="block truncate font-display tracking-wide">
                              {team.name}
                            </span>
                            <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                              {team.players.length} players
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedInGroup && activeTeam ? (
                      <TeamStatDetail
                        activePlayer={activePlayer}
                        activePlayerKey={activePlayerKey}
                        team={activeTeam}
                        onSelectPlayer={onSelectPlayer}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamStatDetail({
  activePlayer,
  activePlayerKey,
  team,
  onSelectPlayer,
}: {
  activePlayer: GGArenaStatRow | null;
  activePlayerKey: string | null;
  team: TournamentStatTeam;
  onSelectPlayer: (row: GGArenaStatRow) => void;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-xl tracking-wide">
            {team.name}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            {team.scope}
          </div>
        </div>
        {team.isSurfBulls ? (
          <div className="rounded-full border border-[color:var(--accent-soft)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[color:var(--accent)]">
            Surf'n Bulls
          </div>
        ) : null}
      </div>

      {team.players.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {team.players.map((player) => {
              const playerKey = getTournamentStatPlayerKey(player);
              const isActive = playerKey === activePlayerKey;
              return (
                <button
                  key={playerKey ?? player.name}
                  type="button"
                  className={
                    isActive
                      ? "rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]"
                      : "rounded-full border border-white/7 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)] transition hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
                  }
                  onClick={() => onSelectPlayer(player)}
                >
                  {formatPlayerName(player)}
                </button>
              );
            })}
          </div>
          {activePlayer ? <PlayerStatDetail row={activePlayer} /> : null}
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-[color:var(--color-muted)]">
          No player stats returned for this team yet.
        </div>
      )}
    </div>
  );
}

function PlayerStatDetail({ row }: { row: GGArenaStatRow }) {
  return (
    <div className="mt-4 rounded-xl border border-white/7 bg-white/[0.02] p-4">
      <div className="truncate font-display text-lg tracking-wide">
        {formatPlayerName(row)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {row.metrics.map((metric) => (
          <div key={metric.key} className="rounded-lg bg-white/[0.025] p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
              {metric.label}
            </div>
            <div className="mt-1 font-display text-xl">
              {formatMetric(metric.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatStandingDetail(row: GGArenaStandingRow | null) {
  if (!row) return "Standings pending";
  const parts = [
    row.points === null ? null : `${row.points} pts`,
    row.played === null ? null : `${row.played} played`,
  ].filter(Boolean);
  return parts.join(" · ") || row.name;
}

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

function formatPlayerName(row: GGArenaStatRow) {
  if (row.playerName) return row.playerName;
  if (row.teamName && row.teamName === row.name) return "Team total";
  return row.name;
}
