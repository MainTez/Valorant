export type ActivityNotificationTone = "success" | "danger" | "warning" | "info";
export type ActivityNotificationKind = "match" | "vod" | "clip" | "task";

export interface ActivityNotificationActor {
  display_name: string | null;
  email: string | null;
}

export interface ActivityNotificationInput {
  id: string;
  actor_id: string | null;
  verb: string;
  object_id: string | null;
  object_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityNotification {
  id: string;
  body: string;
  href: string;
  kind: ActivityNotificationKind;
  title: string;
  tone: ActivityNotificationTone;
}

export function buildActivityNotification(
  event: ActivityNotificationInput,
  actor?: ActivityNotificationActor | null,
): ActivityNotification | null {
  const who = actorName(actor);
  const payload = event.payload ?? {};

  if (event.verb === "logged_match") {
    const result = readString(payload.result);
    const opponent = readString(payload.opponent) ?? "opponent";
    const map = readString(payload.map);
    return {
      id: event.id,
      body: `${who} logged ${formatMatchResult(result)} vs ${opponent}${map ? ` on ${map}` : ""}.`,
      href: event.object_id ? `/matches/${event.object_id}` : "/matches",
      kind: "match",
      title: "Match result logged",
      tone: result === "loss" ? "danger" : result === "win" ? "success" : "info",
    };
  }

  if (event.verb === "linked_match_vod" || event.verb === "uploaded_match_vod") {
    const fileName = readString(payload.fileName);
    return {
      id: event.id,
      body:
        event.verb === "linked_match_vod"
          ? `${who} added a review link to a match.`
          : `${who} uploaded ${fileName ?? "a match VOD"}.`,
      href: event.object_id ? `/vods/${event.object_id}` : "/vods",
      kind: "vod",
      title: event.verb === "linked_match_vod" ? "New VOD link" : "New VOD upload",
      tone: "info",
    };
  }

  if (event.verb === "created_vod_clip") {
    const title = readString(payload.title) ?? "a review clip";
    return {
      id: event.id,
      body: `${who} saved ${title}.`,
      href: "/vods",
      kind: "clip",
      title: "New review clip",
      tone: "info",
    };
  }

  if (event.verb === "created_task" || event.verb === "created_review_action") {
    const title = readString(payload.title) ?? "a task";
    const assigned = readString(payload.assignee_id) ? "assigned" : "created";
    return {
      id: event.id,
      body:
        event.verb === "created_review_action"
          ? `${who} assigned review action: ${title}.`
          : `${who} ${assigned} task: ${title}.`,
      href: "/tasks",
      kind: "task",
      title: event.verb === "created_review_action" ? "Review action assigned" : "Task assigned",
      tone: event.verb === "created_review_action" ? "warning" : "info",
    };
  }

  return null;
}

function actorName(actor?: ActivityNotificationActor | null) {
  return actor?.display_name?.trim() || actor?.email?.split("@")[0] || "Someone";
}

function formatMatchResult(result: string | null) {
  if (result === "win") return "a win";
  if (result === "loss") return "a loss";
  if (result === "draw") return "a draw";
  return "a match";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
