import type { MatchMomentRow, PlayerProfileRow, UserRow } from "@/types/domain";

export type DesktopMoment = MatchMomentRow & {
  actor?: Pick<UserRow, "id" | "display_name" | "email" | "avatar_url"> | null;
  profile?: Pick<
    PlayerProfileRow,
    "id" | "riot_name" | "riot_tag" | "current_rank" | "current_rr"
  > | null;
};
