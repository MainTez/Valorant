import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_POOL_OBJECT_TYPE,
  AGENT_POOL_UPDATED_VERB,
  buildPlayerAgentPools,
  buildSuggestedAgentComp,
  emptyAgentPool,
  normalizeAgentPool,
} from "./agent-pool.ts";

test("normalizeAgentPool keeps agents only under their matching roles", () => {
  assert.deepEqual(normalizeAgentPool({
    Controller: ["Omen", "Jett", "omen"],
    Duelist: ["Raze", "Killjoy"],
    Initiator: ["Sova", "not an agent"],
    Sentinel: ["Cypher"],
  }), {
    Controller: ["Omen"],
    Duelist: ["Raze"],
    Initiator: ["Sova"],
    Sentinel: ["Cypher"],
  });
});

test("buildPlayerAgentPools uses the latest saved event per player", () => {
  const [summary] = buildPlayerAgentPools({
    members: [{ id: "user-1", display_name: "MainTez", email: "main@example.com" }],
    events: [
      {
        actor_id: "user-1",
        created_at: "2026-06-05T12:00:00.000Z",
        object_id: "user-1",
        object_type: AGENT_POOL_OBJECT_TYPE,
        payload: { agent_pool: { Duelist: ["Jett"] } },
        verb: AGENT_POOL_UPDATED_VERB,
      },
      {
        actor_id: "user-1",
        created_at: "2026-06-05T13:00:00.000Z",
        object_id: "user-1",
        object_type: AGENT_POOL_OBJECT_TYPE,
        payload: { agent_pool: { Controller: ["Omen"] } },
        verb: AGENT_POOL_UPDATED_VERB,
      },
    ],
  });

  assert.equal(summary.userId, "user-1");
  assert.deepEqual(summary.agentPool.Controller, ["Omen"]);
  assert.deepEqual(summary.agentPool.Duelist, []);
  assert.equal(summary.updatedAt, "2026-06-05T13:00:00.000Z");
});

test("buildSuggestedAgentComp picks agents from the locked roster pools", () => {
  const poolOne = emptyAgentPool();
  poolOne.Controller = ["Omen", "Astra"];
  const poolTwo = emptyAgentPool();
  poolTwo.Duelist = ["Raze"];
  const poolThree = emptyAgentPool();
  poolThree.Initiator = ["Sova"];
  const poolFour = emptyAgentPool();
  poolFour.Sentinel = ["Cypher"];
  const poolFive = emptyAgentPool();
  poolFive.Duelist = ["Jett"];

  const suggestion = buildSuggestedAgentComp({
    agentPools: new Map([
      ["one", poolOne],
      ["two", poolTwo],
      ["three", poolThree],
      ["four", poolFour],
      ["five", poolFive],
    ]),
    roster: [
      { userId: "one", displayName: "One", preferredRole: "Controller", secondaryRoles: [] },
      { userId: "two", displayName: "Two", preferredRole: "Duelist", secondaryRoles: [] },
      { userId: "three", displayName: "Three", preferredRole: "Initiator", secondaryRoles: [] },
      { userId: "four", displayName: "Four", preferredRole: "Sentinel", secondaryRoles: [] },
      { userId: "five", displayName: "Five", preferredRole: "Duelist", secondaryRoles: [] },
    ],
  });

  assert.deepEqual(suggestion.assignments.map((assignment) => assignment.agent), [
    "Omen",
    "Raze",
    "Sova",
    "Cypher",
    "Jett",
  ]);
  assert.deepEqual(suggestion.warnings, []);
});
