import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRow } from "@/types/domain";

export const runtime = "nodejs";

const DisplayName = z.string().trim().min(1).max(48);

const PROFILE_AVATAR_BUCKET = "profile-avatars";
const PROFILE_AVATAR_MAX_FILE_BYTES = 3 * 1024 * 1024;
const PROFILE_AVATAR_MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

let avatarBucketReady: Promise<void> | null = null;

export async function PATCH(request: NextRequest) {
  try {
    const { user, team } = await requireSession();
    const form = await request.formData();
    const displayNameField = form.get("display_name");
    const displayName = DisplayName.parse(
      typeof displayNameField === "string" ? displayNameField : "",
    );
    const avatarFile = form.get("avatar_file");
    const removeAvatar = form.get("remove_avatar") === "1";
    const supabase = createSupabaseAdminClient();

    let avatarUrl = removeAvatar ? null : user.avatar_url;
    if (avatarFile instanceof File && avatarFile.size > 0) {
      avatarUrl = await uploadProfileAvatar({
        file: avatarFile,
        teamId: team.id,
        userId: user.id,
      });
    }

    const { data, error } = await supabase
      .from("users")
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("display_name, avatar_url")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = data as Pick<UserRow, "display_name" | "avatar_url">;
    return NextResponse.json({
      data: {
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a username between 1 and 48 characters." },
        { status: 400 },
      );
    }
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}

async function uploadProfileAvatar({
  file,
  teamId,
  userId,
}: {
  file: File;
  teamId: string;
  userId: string;
}) {
  assertValidProfileAvatar(file);
  await ensureProfileAvatarBucket();

  const extension = PROFILE_AVATAR_MIME_EXTENSIONS.get(file.type) ?? "img";
  const path = `${teamId}/users/${userId}/${crypto.randomUUID()}.${extension}`;
  const admin = createSupabaseAdminClient();
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, body, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Profile picture uploaded, but no public URL was returned.");
  }

  return data.publicUrl;
}

function assertValidProfileAvatar(file: File) {
  if (!PROFILE_AVATAR_MIME_EXTENSIONS.has(file.type)) {
    throw new Error("Choose a PNG, JPG, WebP, or GIF profile picture.");
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("Choose a profile picture file before saving.");
  }

  if (file.size > PROFILE_AVATAR_MAX_FILE_BYTES) {
    throw new Error("Profile picture must be 3 MB or smaller.");
  }
}

async function ensureProfileAvatarBucket() {
  if (!avatarBucketReady) {
    avatarBucketReady = ensureProfileAvatarBucketInner().catch((error) => {
      avatarBucketReady = null;
      throw error;
    });
  }

  await avatarBucketReady;
}

async function ensureProfileAvatarBucketInner() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.listBuckets();

  if (error) {
    throw new Error(error.message);
  }

  const bucketExists = (data ?? []).some(
    (bucket) =>
      bucket.id === PROFILE_AVATAR_BUCKET || bucket.name === PROFILE_AVATAR_BUCKET,
  );

  if (bucketExists) return;

  const { error: createError } = await admin.storage.createBucket(
    PROFILE_AVATAR_BUCKET,
    {
      allowedMimeTypes: [...PROFILE_AVATAR_MIME_EXTENSIONS.keys()],
      fileSizeLimit: PROFILE_AVATAR_MAX_FILE_BYTES,
      public: true,
    },
  );

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}
