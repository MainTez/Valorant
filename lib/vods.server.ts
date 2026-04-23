import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MATCH_VOD_BUCKET,
  MATCH_VOD_MAX_FILE_BYTES,
  MATCH_VOD_SIGNED_URL_TTL_SECONDS,
  type MatchVodPlaybackData,
  assertValidMatchVodUpload,
  buildMatchVodObjectPath,
  resolveMatchVodSource,
} from "@/lib/vods";

const MATCH_VOD_ALLOWED_MIME_TYPES = ["video/mp4", "application/mp4"];

let bucketReady: Promise<void> | null = null;

export async function createMatchVodSignedUpload(params: {
  teamId: string;
  matchId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}) {
  assertValidMatchVodUpload({
    contentType: params.contentType,
    fileName: params.fileName,
    fileSize: params.fileSize,
  });

  await ensureMatchVodBucket();

  const path = buildMatchVodObjectPath({
    fileName: params.fileName,
    matchId: params.matchId,
    teamId: params.teamId,
    uploadId: crypto.randomUUID(),
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(MATCH_VOD_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create VOD upload URL.");
  }

  return { path, token: data.token };
}

export async function createMatchVodSignedUrl(path: string): Promise<string> {
  await ensureMatchVodBucket();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(MATCH_VOD_BUCKET)
    .createSignedUrl(path, MATCH_VOD_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create VOD access URL.");
  }

  return data.signedUrl;
}

export async function getMatchVodPlaybackData(input: {
  vod_content_type: string | null;
  vod_original_name: string | null;
  vod_size_bytes: number | null;
  vod_storage_path: string | null;
  vod_url: string | null;
}): Promise<MatchVodPlaybackData> {
  const source = resolveMatchVodSource({
    vod_storage_path: input.vod_storage_path,
    vod_url: input.vod_url,
  });

  if (source.kind === "uploaded") {
    const signedUrl = await createMatchVodSignedUrl(source.path);
    return {
      kind: "uploaded",
      signedUrl,
      expiresAt: new Date(Date.now() + MATCH_VOD_SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      fileName: input.vod_original_name,
      sizeBytes: input.vod_size_bytes,
      contentType: input.vod_content_type,
    };
  }

  if (source.kind === "external") {
    return source;
  }

  return {
    kind: "missing",
    message: "No VOD is attached to this match yet.",
  };
}

export async function deleteMatchVodObject(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(MATCH_VOD_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureMatchVodBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = ensureMatchVodBucketInner().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }

  await bucketReady;
}

async function ensureMatchVodBucketInner(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.listBuckets();

  if (error) {
    throw new Error(error.message);
  }

  const bucketExists = (data ?? []).some(
    (bucket) => bucket.id === MATCH_VOD_BUCKET || bucket.name === MATCH_VOD_BUCKET,
  );

  if (bucketExists) return;

  const { error: createError } = await admin.storage.createBucket(MATCH_VOD_BUCKET, {
    allowedMimeTypes: MATCH_VOD_ALLOWED_MIME_TYPES,
    fileSizeLimit: MATCH_VOD_MAX_FILE_BYTES,
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}
