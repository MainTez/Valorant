"use client";

import type { MatchVodPlaybackData } from "@/lib/vods";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MATCH_VOD_BUCKET, assertValidMatchVodUpload } from "@/lib/vods";

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
