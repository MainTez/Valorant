import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/get-session";
import { createVodClipSignedUpload } from "@/lib/vods.server";
import { VOD_CLIP_MAX_FILE_BYTES } from "@/lib/vods";

export const runtime = "nodejs";

const CreateUploadPayload = z.object({
  contentType: z.string().min(1).max(120),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(VOD_CLIP_MAX_FILE_BYTES),
});

export async function POST(request: NextRequest) {
  try {
    const { team } = await requireSession();
    const body = CreateUploadPayload.parse(await request.json());
    const data = await createVodClipSignedUpload({
      contentType: body.contentType,
      fileName: body.fileName,
      fileSize: body.fileSize,
      teamId: team.id,
    });

    return NextResponse.json({ data });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status });
  }
}
