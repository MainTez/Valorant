import { strict as assert } from "node:assert";
import { test } from "node:test";

import { VIP_EMAILS, VIP_USER_IDS, isVipEmail } from "./vip-config.ts";

test("VIP emails and ids cover the same set of teams", () => {
  const emailTeams = Object.keys(VIP_EMAILS).sort();
  const idTeams = Object.keys(VIP_USER_IDS).sort();
  assert.deepEqual(emailTeams, idTeams);
});

test("VIP user ids use the reserved a0xx UUID namespace", () => {
  for (const id of Object.values(VIP_USER_IDS)) {
    assert.match(id, /^00000000-0000-0000-0000-00000000a0\d\d$/);
  }
});

test("isVipEmail matches configured VIP emails case-insensitively", () => {
  for (const email of Object.values(VIP_EMAILS)) {
    assert.equal(isVipEmail(email), true);
    assert.equal(isVipEmail(email.toUpperCase()), true);
  }
  assert.equal(isVipEmail("someone-else@example.com"), false);
  assert.equal(isVipEmail(null), false);
  assert.equal(isVipEmail(undefined), false);
});
