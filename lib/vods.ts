export const MATCH_VOD_BUCKET = "match-vods";
export const MATCH_VOD_MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
export const MATCH_VOD_SIGNED_URL_TTL_SECONDS = 60 * 60;

const MP4_MIME_TYPES = new Set(["video/mp4", "application/mp4"]);
const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|m4v)(?:$|[?#])/i;

export interface MatchVodUploadInput {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export type MatchVodSource =
  | { kind: "uploaded"; path: string }
  | { kind: "external"; url: string; isDirectVideo: boolean }
  | { kind: "missing" };

export type MatchVodPlaybackData =
  | {
      kind: "uploaded";
      signedUrl: string;
      expiresAt: string;
      fileName: string | null;
      sizeBytes: number | null;
      contentType: string | null;
    }
  | { kind: "external"; url: string; isDirectVideo: boolean }
  | { kind: "missing"; message: string };

export function sanitizeMatchVodFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const base = trimmed.toLowerCase().replace(/\.mp4$/i, "");
  const safeBase = base
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${safeBase || "vod"}.mp4`;
}

export function assertValidMatchVodUpload(input: MatchVodUploadInput): void {
  if (!input.fileName.trim()) {
    throw new Error("VOD upload requires a file name.");
  }

  if (!input.contentType || !MP4_MIME_TYPES.has(input.contentType)) {
    throw new Error("VOD upload must be an MP4 file.");
  }

  if (!/\.mp4$/i.test(input.fileName)) {
    throw new Error("VOD upload must use the .mp4 extension.");
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    throw new Error("VOD upload must have a positive file size.");
  }

  if (input.fileSize > MATCH_VOD_MAX_FILE_BYTES) {
    throw new Error("VOD upload is too large.");
  }
}

export function buildMatchVodObjectPath({
  teamId,
  matchId,
  uploadId,
  fileName,
}: {
  teamId: string;
  matchId: string;
  uploadId: string;
  fileName: string;
}): string {
  return `${teamId}/matches/${matchId}/${uploadId}-${sanitizeMatchVodFileName(fileName)}`;
}

export function isMatchVodPathForTeam(path: string, teamId: string): boolean {
  const segments = path.split("/");
  return segments.length >= 4 && segments[0] === teamId && segments[1] === "matches";
}

export function isMatchVodPathForMatch(path: string, teamId: string, matchId: string): boolean {
  const segments = path.split("/");
  return (
    segments.length >= 4 &&
    segments[0] === teamId &&
    segments[1] === "matches" &&
    segments[2] === matchId
  );
}

export function resolveMatchVodSource(input: {
  vod_storage_path: string | null;
  vod_url: string | null;
}): MatchVodSource {
  if (input.vod_storage_path) {
    return {
      kind: "uploaded",
      path: input.vod_storage_path,
    };
  }

  if (input.vod_url) {
    return {
      kind: "external",
      url: input.vod_url,
      isDirectVideo: isDirectVideoUrl(input.vod_url),
    };
  }

  return { kind: "missing" };
}

export function canDeleteMatch(input: {
  createdBy: string | null;
  role: "player" | "coach" | "admin";
  userId: string;
}): boolean {
  return input.role === "admin" || input.role === "coach" || input.createdBy === input.userId;
}

export function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_EXTENSIONS.test(url);
}
