"use client";

import type { MatchVodPlaybackData } from "@/lib/vods";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MATCH_VOD_BUCKET,
  MATCH_VOD_RESUMABLE_CHUNK_BYTES,
  VOD_CLIP_BUCKET,
  assertValidMatchVodUpload,
  assertValidVodClipUpload,
} from "@/lib/vods";
import type { VodClipRow } from "@/types/domain";

interface UploadMatchVodParams {
  file: File;
  matchId: string;
  onProgress?: (progress: { uploadedBytes: number; totalBytes: number }) => void;
}

interface SignedUploadResponse {
  data?: {
    path: string;
    token: string;
  };
  error?: string;
}

interface ApiResponse {
  error?: string;
}

interface ClipCreateResponse {
  data?: VodClipRow;
  error?: string;
}

interface PlaybackResponse {
  data?: MatchVodPlaybackData;
  error?: string;
}

export async function uploadMatchVod({
  file,
  matchId,
  onProgress,
}: UploadMatchVodParams): Promise<void> {
  assertValidMatchVodUpload({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });

  const signedUploadResponse = await fetch(`/api/matches/${matchId}/vod`, {
    body: JSON.stringify({
      contentType: file.type,
      fileName: file.name,
      fileSize: file.size,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const signedUploadBody = (await signedUploadResponse.json().catch(() => ({}))) as SignedUploadResponse;
  if (!signedUploadResponse.ok || !signedUploadBody.data) {
    throw new Error(signedUploadBody.error ?? "Failed to start VOD upload.");
  }

  const supabase = createSupabaseBrowserClient();
  await uploadMatchVodResumable({
    contentType: file.type,
    file,
    onProgress,
    path: signedUploadBody.data.path,
    supabase,
    token: signedUploadBody.data.token,
  });

  const attachResponse = await fetch(`/api/matches/${matchId}/vod`, {
    body: JSON.stringify({
      vod_content_type: file.type,
      vod_original_name: file.name,
      vod_size_bytes: file.size,
      vod_storage_path: signedUploadBody.data.path,
    }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!attachResponse.ok) {
    const attachBody = (await attachResponse.json().catch(() => ({}))) as ApiResponse;
    throw new Error(attachBody.error ?? "Failed to attach uploaded VOD to the match.");
  }
}

async function uploadMatchVodResumable({
  contentType,
  file,
  onProgress,
  path,
  supabase,
  token,
}: {
  contentType: string;
  file: File;
  onProgress?: (progress: { uploadedBytes: number; totalBytes: number }) => void;
  path: string;
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  token: string;
}): Promise<void> {
  const endpoint = buildSupabaseStorageEndpoint();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Supabase anon key is missing.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authToken = session?.access_token ?? anonKey;
  const authHeaders = {
    apikey: anonKey,
    authorization: `Bearer ${authToken}`,
    "x-signature": token,
  };

  const createResponse = await fetch(endpoint, {
    headers: {
      ...authHeaders,
      "tus-resumable": "1.0.0",
      "upload-length": String(file.size),
      "upload-metadata": buildTusMetadata({
        bucketName: MATCH_VOD_BUCKET,
        cacheControl: "3600",
        contentType,
        objectName: path,
      }),
      "x-upsert": "false",
    },
    method: "POST",
  });

  if (!createResponse.ok) {
    throw new Error(await readUploadError(createResponse, "Failed to start resumable VOD upload."));
  }

  const location = createResponse.headers.get("location");
  if (!location) {
    throw new Error("Supabase did not return a resumable upload location.");
  }

  const uploadUrl = new URL(location, endpoint).toString();
  let offset = parseUploadOffset(createResponse.headers.get("upload-offset")) ?? 0;
  onProgress?.({ uploadedBytes: offset, totalBytes: file.size });

  while (offset < file.size) {
    const nextOffset = Math.min(offset + MATCH_VOD_RESUMABLE_CHUNK_BYTES, file.size);
    const chunk = file.slice(offset, nextOffset, contentType);
    const patchResponse = await fetch(uploadUrl, {
      body: chunk,
      headers: {
        ...authHeaders,
        "content-type": "application/offset+octet-stream",
        "tus-resumable": "1.0.0",
        "upload-offset": String(offset),
      },
      method: "PATCH",
    });

    if (!patchResponse.ok) {
      throw new Error(await readUploadError(patchResponse, "VOD upload failed."));
    }

    offset = parseUploadOffset(patchResponse.headers.get("upload-offset")) ?? nextOffset;
    onProgress?.({ uploadedBytes: offset, totalBytes: file.size });
  }
}

function buildSupabaseStorageEndpoint(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("Supabase URL is missing.");
  }

  const url = new URL(rawUrl);
  if (url.hostname.endsWith(".supabase.co")) {
    url.hostname = url.hostname.replace(".supabase.co", ".storage.supabase.co");
  }

  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  return url.toString();
}

function buildTusMetadata(metadata: Record<string, string>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key} ${base64Encode(value)}`)
    .join(",");
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function parseUploadOffset(value: string | null): number | null {
  if (!value) return null;
  const offset = Number(value);
  return Number.isFinite(offset) && offset >= 0 ? offset : null;
}

async function readUploadError(response: Response, fallback: string): Promise<string> {
  const body = (await response.clone().json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;
  if (body?.error) return body.error;
  if (body?.message) return body.message;

  const text = await response.text().catch(() => "");
  return text.trim() || fallback;
}

export async function fetchMatchVodPlayback(matchId: string): Promise<MatchVodPlaybackData> {
  const response = await fetch(`/api/matches/${matchId}/vod/playback`, {
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as PlaybackResponse;
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Failed to load VOD playback.");
  }

  return body.data;
}

export async function uploadVodClip({
  description,
  endSeconds,
  file,
  map,
  matchId,
  opponent,
  startSeconds,
  tags,
  title,
}: {
  description: string | null;
  endSeconds: number | null;
  file: File;
  map: string | null;
  matchId: string | null;
  opponent: string | null;
  startSeconds: number | null;
  tags: string[];
  title: string;
}): Promise<VodClipRow> {
  assertValidVodClipUpload({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });

  const signedUploadResponse = await fetch("/api/vod-clips/upload", {
    body: JSON.stringify({
      contentType: file.type,
      fileName: file.name,
      fileSize: file.size,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const signedUploadBody = (await signedUploadResponse.json().catch(() => ({}))) as SignedUploadResponse;
  if (!signedUploadResponse.ok || !signedUploadBody.data) {
    throw new Error(signedUploadBody.error ?? "Failed to start clip upload.");
  }

  const supabase = createSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(VOD_CLIP_BUCKET)
    .uploadToSignedUrl(signedUploadBody.data.path, signedUploadBody.data.token, file, {
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return createVodClip({
    content_type: file.type,
    description,
    end_seconds: endSeconds,
    external_url: null,
    map,
    match_id: matchId,
    opponent,
    original_name: file.name,
    size_bytes: file.size,
    source_type: "upload",
    start_seconds: startSeconds,
    storage_path: signedUploadBody.data.path,
    tags,
    title,
  });
}

export async function createVodClip(input: {
  content_type?: string | null;
  description: string | null;
  end_seconds: number | null;
  external_url: string | null;
  map: string | null;
  match_id: string | null;
  opponent: string | null;
  original_name?: string | null;
  size_bytes?: number | null;
  source_type: "upload" | "external";
  start_seconds: number | null;
  storage_path?: string | null;
  tags: string[];
  title: string;
}): Promise<VodClipRow> {
  const response = await fetch("/api/vod-clips", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const body = (await response.json().catch(() => ({}))) as ClipCreateResponse;
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Failed to save clip.");
  }

  return body.data;
}
