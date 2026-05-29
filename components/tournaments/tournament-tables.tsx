"use client";

import { useState, type KeyboardEvent } from "react";
import { BarChart3, ChevronDown, Table2 } from "lucide-react";
import {
  groupStandingRows,
  isStandingGroupOpenByDefault,
} from "@/lib/ggarena/standings";
import {
  findTournamentStatForStanding,
  getDefaultTournamentStatKey,
  getTournamentStatRowKey,
  groupTournamentStatRows,
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
  const [selectedStatKey, setSelectedStatKey] = useState<string | null>(() =>
    getDefaultTournamentStatKey(stats),
  );
  const [openStatScopes, setOpenStatScopes] = useState<Set<string>>(() => {
    const defaultRow = getSelectedStatRow(stats, getDefaultTournamentStatKey(stats));
    return defaultRow ? new Set([statScope(defaultRow)]) : new Set();
  });

  const activeStat = getSelectedStatRow(stats, selectedStatKey);
  const activeStatKey = getTournamentStatRowKey(activeStat);

  function selectStat(row: GGArenaStatRow) {
    setSelectedStatKey(getTournamentStatRowKey(row));
    setOpenStatScopes((current) => new Set(current).add(statScope(row)));
  }

  function selectStanding(row: GGArenaStandingRow) {
    const matchingStat = findTournamentStatForStanding(row, stats);
    if (matchingStat) selectStat(matchingStat);
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
        activeStatKey={activeStatKey}
        rows={standings}
        stats={stats}
        onSelectTeam={selectStanding}
      />
      <StatsTable
        activeKey={activeStatKey}
        activeRow={activeStat}
        openScopes={openStatScopes}
        rows={stats}
        onSelectTeam={selectStat}
        onToggleScope={toggleStatScope}
      />
    </section>
  );
}

function StandingsTable({
  activeStatKey,
  rows,
  stats,
  onSelectTeam,
}: {
  activeStatKey: string | null;
  rows: GGArenaStandingRow[];
  stats: GGArenaStatRow[];
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
                    <div className="font-display text-lg tracking-wide">
                      {group.scope}
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
                        const matchingStat = findTournamentStatForStanding(row, stats);
                        const isActive =
                          matchingStat !== null &&
                          getTournamentStatRowKey(matchingStat) === activeStatKey;
                        return (
                          <tr
                            key={`${group.scope}-${row.id ?? row.name}-${row.rank ?? ""}`}
                            role="button"
                            tabIndex={0}
                            title={`Show tournament stats for ${row.name}`}
                            className={
                              row.isSurfBulls
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
  activeKey,
  activeRow,
  openScopes,
  rows,
  onSelectTeam,
  onToggleScope,
}: {
  activeKey: string | null;
  activeRow: GGArenaStatRow | null;
  openScopes: Set<string>;
  rows: GGArenaStatRow[];
  onSelectTeam: (row: GGArenaStatRow) => void;
  onToggleScope: (scope: string) => void;
}) {
  const groups = groupTournamentStatRows(rows);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 p-5">
        <div>
          <div className="eyebrow">Tournament Stats</div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Open one team at a time from the division dropdowns
          </div>
        </div>
        <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[color:var(--color-muted)]">
          No stat rows returned.
        </div>
      ) : (
        <div className="divide-y divide-white/7">
          {groups.map((group) => {
            const isOpen = openScopes.has(group.scope);
            const selectedInGroup =
              activeRow !== null && statScope(activeRow) === group.scope;
            return (
              <div key={group.scope}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                  aria-expanded={isOpen}
                  onClick={() => onToggleScope(group.scope)}
                >
                  <div className="min-w-0">
                    <div className="font-display text-lg tracking-wide">
                      {group.scope}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                      {group.rows.length} teams
                      {selectedInGroup && activeRow ? ` · showing ${activeRow.name}` : ""}
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
                      {group.rows.map((row) => {
                        const rowKey = getTournamentStatRowKey(row);
                        const isActive = rowKey === activeKey;
                        return (
                          <button
                            key={rowKey ?? row.name}
                            type="button"
                            className={
                              isActive
                                ? "rounded-lg border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] px-3 py-2 text-left text-[color:var(--accent)]"
                                : "rounded-lg border border-white/7 bg-white/[0.02] px-3 py-2 text-left transition hover:border-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
                            }
                            onClick={() => onSelectTeam(row)}
                          >
                            <span className="block truncate font-display tracking-wide">
                              {row.name}
                            </span>
                            <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                              {row.metrics.length} metrics
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedInGroup && activeRow ? <StatDetail row={activeRow} /> : null}
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

function StatDetail({ row }: { row: GGArenaStatRow }) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-xl tracking-wide">
            {row.name}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            {row.scope ?? "Tournament"}
          </div>
        </div>
        {row.isSurfBulls ? (
          <div className="rounded-full border border-[color:var(--accent-soft)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[color:var(--accent)]">
            Surf'n Bulls
          </div>
        ) : null}
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

function getSelectedStatRow(rows: GGArenaStatRow[], key: string | null) {
  return rows.find((row) => getTournamentStatRowKey(row) === key) ?? null;
}

function statScope(row: GGArenaStatRow) {
  return row.scope ?? "Tournament";
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
