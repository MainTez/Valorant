import { runEngine, type EngineInput, type EngineOutput } from "./engine.ts";
import {
  filterMatchesToCurrentAct,
  filterMmrHistoryToMatchWindow,
} from "../valorant/acts.ts";

export function runCurrentActEngine(input: EngineInput): EngineOutput {
  const scope = filterMatchesToCurrentAct(input.matches);
  const scopedHistory = filterMmrHistoryToMatchWindow(
    input.mmrHistory ?? [],
    scope.matches,
  );
  const engine = runEngine({
    ...input,
    matches: scope.matches,
    mmrHistory: scopedHistory,
  });
  const excluded = Math.max(0, scope.totalMatches - scope.matches.length);

  return {
    ...engine,
    dataPoints: {
      currentAct: scope.act.label,
      currentActKey: scope.act.key,
      matchesAvailableBeforeActFilter: scope.totalMatches,
      matchesExcludedByActFilter: excluded,
      ...engine.dataPoints,
    },
  };
}
