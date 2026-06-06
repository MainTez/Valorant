import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityNotification } from "./activity-notifications.ts";

test("buildActivityNotification formats match results", () => {
  const notification = buildActivityNotification(
    {
      actor_id: "user-1",
      created_at: "2026-06-06T12:00:00.000Z",
      id: "event-1",
      object_id: "match-1",
      object_type: "match",
      payload: { map: "Haven", opponent: "Demure and mindful", result: "win" },
      verb: "logged_match",
    },
    { display_name: "MainTez", email: "main@example.com" },
  );

  assert.equal(notification?.title, "Match result logged");
  assert.equal(notification?.body, "MainTez logged a win vs Demure and mindful on Haven.");
  assert.equal(notification?.href, "/matches/match-1");
  assert.equal(notification?.tone, "success");
});

test("buildActivityNotification formats VOD link and clip events", () => {
  assert.deepEqual(
    buildActivityNotification({
      actor_id: "user-1",
      created_at: "2026-06-06T12:00:00.000Z",
      id: "event-2",
      object_id: "match-2",
      object_type: "match",
      payload: { url: "https://medal.tv/example" },
      verb: "linked_match_vod",
    })?.title,
    "New VOD link",
  );

  assert.equal(
    buildActivityNotification({
      actor_id: "user-1",
      created_at: "2026-06-06T12:01:00.000Z",
      id: "event-3",
      object_id: "clip-1",
      object_type: "vod_clip",
      payload: { title: "2v4 retake" },
      verb: "created_vod_clip",
    })?.body,
    "Someone saved 2v4 retake.",
  );
});

test("buildActivityNotification formats assigned task events", () => {
  const notification = buildActivityNotification({
    actor_id: "coach-1",
    created_at: "2026-06-06T12:02:00.000Z",
    id: "event-4",
    object_id: "task-1",
    object_type: "task",
    payload: { assignee_id: "player-1", title: "Review Haven retakes" },
    verb: "created_task",
  });

  assert.equal(notification?.title, "Task assigned");
  assert.equal(notification?.body, "Someone assigned task: Review Haven retakes.");
  assert.equal(notification?.href, "/tasks");
});

test("buildActivityNotification ignores low-signal activity", () => {
  assert.equal(
    buildActivityNotification({
      actor_id: "user-1",
      created_at: "2026-06-06T12:03:00.000Z",
      id: "event-5",
      object_id: "routine-1",
      object_type: "routine",
      payload: {},
      verb: "completed_routine",
    }),
    null,
  );
});
