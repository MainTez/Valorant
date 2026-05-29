export interface TournamentDivisionLike {
  id: number | null;
  name: string;
  competitionId: number | null;
}

export interface TournamentSignupLike {
  competitionId: number | null;
  divisionId: number | null;
}

export function selectTournamentDivisions<T extends TournamentDivisionLike>({
  configuredDivisionIds,
  divisions,
  signups,
}: {
  configuredDivisionIds: number[];
  divisions: T[];
  signups: TournamentSignupLike[];
}): T[] {
  if (configuredDivisionIds.length > 0) {
    const wanted = new Set(configuredDivisionIds);
    return configuredDivisionIds
      .map((id) => divisions.find((division) => division.id === id) ?? null)
      .filter((division): division is T => Boolean(division && wanted.has(division.id ?? -1)));
  }

  const signupCompetitionIds = new Set(
    signups.map((signup) => signup.competitionId).filter((id): id is number => Number.isInteger(id)),
  );

  if (signupCompetitionIds.size > 0) {
    const competitionDivisions = divisions.filter((division) =>
      division.competitionId != null && signupCompetitionIds.has(division.competitionId),
    );
    return sortDivisions(competitionDivisions);
  }

  const signupDivisionIds = new Set(
    signups.map((signup) => signup.divisionId).filter((id): id is number => Number.isInteger(id)),
  );

  if (signupDivisionIds.size > 0) {
    return sortDivisions(divisions.filter((division) => division.id != null && signupDivisionIds.has(division.id)));
  }

  return sortDivisions(divisions);
}

function sortDivisions<T extends TournamentDivisionLike>(divisions: T[]): T[] {
  return [...divisions].sort((a, b) => {
    const aRank = divisionOrder(a.name, a.id);
    const bRank = divisionOrder(b.name, b.id);
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function divisionOrder(name: string, id: number | null): number {
  const match = name.match(/\b([1-4])(?:\.|st|nd|rd|th)?\b/i) ?? name.match(/division\s*([1-4])/i);
  if (match) return Number(match[1]);
  return id ?? Number.MAX_SAFE_INTEGER;
}
