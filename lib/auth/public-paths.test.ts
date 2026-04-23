import assert from "node:assert/strict";
import test from "node:test";
import { isPublicPath } from "./public-paths.ts";

test("isPublicPath allows anonymous auth endpoints and login shell", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/auth/callback"), true);
  assert.equal(isPublicPath("/api/auth/vip-login"), true);
  assert.equal(isPublicPath("/api/auth/vip-logout"), true);
  assert.equal(isPublicPath("/api/cron/refresh-stats"), true);
});

test("isPublicPath keeps app pages protected", () => {
  assert.equal(isPublicPath("/dashboard"), false);
  assert.equal(isPublicPath("/api/matches/123/vod"), false);
});
