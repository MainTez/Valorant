"use client";

import type { MatchVodPlaybackData } from "@/lib/vods";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MATCH_VOD_BUCKET,
  VOD_CLIP_BUCKET,
  assertValidMatchVodUpload,
  assertValidVodClipUpload,
} from "@/lib/vods";
import type { VodClipRow } from "@/types/domain";

interface UploadMatchVodParams {
  file: File;
  matchId: string;
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

export async function uploadMatchVod({ file, matchId }: UploadMatchVodParams): Promise<void> {
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
  const { error: uploadError } = await supabase.storage
    .from(MATCH_VOD_BUCKET)
    .uploadToSignedUrl(signedUploadBody.data.path, signedUploadBody.data.token, file, {
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

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
