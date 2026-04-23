export const MATCH_VOD_BUCKET = "match-vods";
export const MATCH_VOD_MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
export const MATCH_VOD_SIGNED_URL_TTL_SECONDS = 60 * 60;

const MP4_MIME_TYPES = new Set(["video/mp4", "application/mp4"]);

export interface MatchVodUploadInput {
  fileName: string;
  fileSize: number;
  contentType: string;
}

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
