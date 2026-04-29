import assert from "node:assert/strict";
import test from "node:test";
import { buildMatchMoment } from "./match-moments.ts";

const base = {
  playerName: "Johan",
  matchId: "match-1",
  map: "Ascent",
  agent: "Jett",
  assists: 4,
  startedAt: "2026-04-29T20:00:00.000Z",
};

test("buildMatchMoment calls out hard carry wins", () => {
  const moment = buildMatchMoment({
    ...base,
    result: "win",
    scoreTeam: 13,
    scoreOpponent: 5,
    kills: 28,
    deaths: 9,
    acs: 330,
    adr: 190,
    headshotPct: 31,
  });

  assert.equal(moment.label, "CARRIED ALL!!");
  assert.equal(moment.severity, "hype");
  assert.equal(moment.sound, "carry");
});

test("buildMatchMoment calls out rough losses as inted", () => {
  const moment = buildMatchMoment({
    ...base,
    result: "loss",
    scoreTeam: 4,
    scoreOpponent: 13,
    kills: 5,
    deaths: 18,
    acs: 93,
    adr: 60,
    headshotPct: 7,
  });

  assert.equal(moment.label, "INTED MATCH");
  assert.equal(moment.severity, "flame");
  assert.equal(moment.sound, "inted");
});

test("buildMatchMoment recognizes strong losses", () => {
  const moment = buildMatchMoment({
    ...base,
    result: "loss",
    scoreTeam: 11,
    scoreOpponent: 13,
    kills: 30,
    deaths: 14,
    acs: 315,
    adr: 178,
    headshotPct: 24,
  });

  assert.equal(moment.label, "TEAM SOLD HIM");
  assert.equal(moment.severity, "hype");
});

test("buildMatchMoment keeps normal wins simple", () => {
  const moment = buildMatchMoment({
    ...base,
    result: "win",
    scoreTeam: 13,
    scoreOpponent: 10,
    kills: 15,
    deaths: 14,
    acs: 205,
    adr: 126,
    headshotPct: 18,
  });

  assert.equal(moment.label, "Won match");
  assert.equal(moment.severity, "normal");
  assert.equal(moment.sound, "normal");
});
