import assert from "node:assert/strict";
import test from "node:test";
import {
  isValorantRole,
  normalizeSecondaryValorantRoles,
} from "./roles.ts";

test("valorant role validation accepts only supported role names", () => {
  assert.equal(isValorantRole("Duelist"), true);
  assert.equal(isValorantRole("Controller"), true);
  assert.equal(isValorantRole("Flex"), false);
  assert.equal(isValorantRole(null), false);
});

test("secondary role normalizer removes invalid, duplicate, and preferred roles", () => {
  assert.deepEqual(
    normalizeSecondaryValorantRoles("Duelist", [
      "Initiator",
      "Duelist",
      "Initiator",
      "Flex",
      "Controller",
    ]),
    ["Initiator", "Controller"],
  );
});
