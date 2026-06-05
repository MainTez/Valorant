import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MATCH_VOD_BUCKET,
  MATCH_VOD_MAX_FILE_BYTES,
  MATCH_VOD_SUPABASE_FALLBACK_MAX_FILE_BYTES,
  MATCH_VOD_SIGNED_URL_TTL_SECONDS,
  VOD_CLIP_ALLOWED_MIME_TYPES,
  VOD_CLIP_BUCKET,
  VOD_CLIP_MAX_FILE_BYTES,
  VOD_CLIP_SIGNED_URL_TTL_SECONDS,
  type MatchVodPlaybackData,
  type VodClipPlaybackData,
  assertValidMatchVodUpload,
  assertValidVodClipUpload,
  buildMatchVodObjectPath,
  buildVodClipObjectPath,
  resolveMatchVodSource,
  resolveVodClipSource,
  stripVodStorageProviderPrefix,
} from "@/lib/vods";
import {
  createR2VodSignedUpload,
  createR2VodSignedUrl,
  deleteR2VodObject,
  isR2Configured,
  parseR2VodStoragePath,
} from "@/lib/r2";

const MATCH_VOD_ALLOWED_MIME_TYPES = ["video/mp4", "application/mp4"];

let bucketReady: Promise<void> | null = null;
let clipBucketReady: Promise<void> | null = null;

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

  const path = buildMatchVodObjectPath({
    fileName: params.fileName,
    matchId: params.matchId,
    teamId: params.teamId,
    uploadId: crypto.randomUUID(),
  });

  if (isR2Configured()) {
    return createR2VodSignedUpload({
      contentType: params.contentType,
      key: path,
    });
  }

  if (params.fileSize > MATCH_VOD_SUPABASE_FALLBACK_MAX_FILE_BYTES) {
    throw new Error(
      "Cloudflare R2 is required for VOD uploads over 50 MB. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  await ensureMatchVodBucket();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(MATCH_VOD_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create VOD upload URL.");
  }

  return { path, provider: "supabase" as const, token: data.token };
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

export async function createVodClipSignedUpload(params: {
  teamId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}) {
  assertValidVodClipUpload({
    contentType: params.contentType,
    fileName: params.fileName,
    fileSize: params.fileSize,
  });

  await ensureVodClipBucket();

  const path = buildVodClipObjectPath({
    fileName: params.fileName,
    teamId: params.teamId,
    uploadId: crypto.randomUUID(),
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(VOD_CLIP_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create clip upload URL.");
  }

  return { path, token: data.token };
}

export async function createVodClipSignedUrl(path: string): Promise<string> {
  await ensureVodClipBucket();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(VOD_CLIP_BUCKET)
    .createSignedUrl(path, VOD_CLIP_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create clip access URL.");
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
    const signedUrl =
      source.provider === "r2"
        ? await createR2VodSignedUrl(stripVodStorageProviderPrefix(source.path).path)
        : await createMatchVodSignedUrl(source.path);
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

export async function getVodClipPlaybackData(input: {
  content_type: string | null;
  external_url: string | null;
  original_name: string | null;
  size_bytes: number | null;
  storage_path: string | null;
}): Promise<VodClipPlaybackData> {
  const source = resolveVodClipSource({
    external_url: input.external_url,
    storage_path: input.storage_path,
  });

  if (source.kind === "uploaded") {
    const signedUrl = await createVodClipSignedUrl(source.path);
    return {
      kind: "uploaded",
      signedUrl,
      expiresAt: new Date(Date.now() + VOD_CLIP_SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      fileName: input.original_name,
      sizeBytes: input.size_bytes,
      contentType: input.content_type,
    };
  }

  if (source.kind === "external") {
    return source;
  }

  return {
    kind: "missing",
    message: "No clip source is attached yet.",
  };
}

export async function deleteMatchVodObject(path: string): Promise<void> {
  const r2Key = parseR2VodStoragePath(path);
  if (r2Key) {
    await deleteR2VodObject(r2Key);
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(MATCH_VOD_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVodClipObject(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(VOD_CLIP_BUCKET).remove([path]);

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

async function ensureVodClipBucket(): Promise<void> {
  if (!clipBucketReady) {
    clipBucketReady = ensureVodClipBucketInner().catch((error) => {
      clipBucketReady = null;
      throw error;
    });
  }

  await clipBucketReady;
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

  if (bucketExists) {
    const { error: updateError } = await admin.storage.updateBucket(MATCH_VOD_BUCKET, {
      allowedMimeTypes: MATCH_VOD_ALLOWED_MIME_TYPES,
      fileSizeLimit: MATCH_VOD_MAX_FILE_BYTES,
      public: false,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: createError } = await admin.storage.createBucket(MATCH_VOD_BUCKET, {
    allowedMimeTypes: MATCH_VOD_ALLOWED_MIME_TYPES,
    fileSizeLimit: MATCH_VOD_MAX_FILE_BYTES,
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}

async function ensureVodClipBucketInner(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.listBuckets();

  if (error) {
    throw new Error(error.message);
  }

  const bucketExists = (data ?? []).some(
    (bucket) => bucket.id === VOD_CLIP_BUCKET || bucket.name === VOD_CLIP_BUCKET,
  );

  if (bucketExists) {
    const { error: updateError } = await admin.storage.updateBucket(VOD_CLIP_BUCKET, {
      allowedMimeTypes: VOD_CLIP_ALLOWED_MIME_TYPES,
      fileSizeLimit: VOD_CLIP_MAX_FILE_BYTES,
      public: false,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: createError } = await admin.storage.createBucket(VOD_CLIP_BUCKET, {
    allowedMimeTypes: VOD_CLIP_ALLOWED_MIME_TYPES,
    fileSizeLimit: VOD_CLIP_MAX_FILE_BYTES,
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}
