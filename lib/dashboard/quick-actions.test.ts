import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardQuickActions } from "./quick-actions.ts";

test("Surf'n Bulls dashboard quick actions include the tournaments page", () => {
  const actions = getDashboardQuickActions("surf-n-bulls");

  assert.ok(actions.some((action) => action.label === "Tournaments" && action.href === "/tournaments"));
});

test("Molgarians dashboard quick actions do not link to the Surf-only tournaments page", () => {
  const actions = getDashboardQuickActions("molgarians");

  assert.equal(actions.some((action) => action.href === "/tournaments"), false);
});
