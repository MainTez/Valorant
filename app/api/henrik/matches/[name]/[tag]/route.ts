import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { henrikMatches } from "@/lib/henrik/client";
import { normalizeMatches } from "@/lib/henrik/normalize";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; tag: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, tag } = await params;
  const region = request.nextUrl.searchParams.get("region") ?? undefined;
  const force = request.nextUrl.searchParams.get("force") === "1";
  const sizeParam = request.nextUrl.searchParams.get("size");
  const size = sizeParam ? Math.min(20, Math.max(1, parseInt(sizeParam, 10))) : 10;
  try {
    const res = await henrikMatches(name, tag, region ?? "eu", { force, size });
    const matches = normalizeMatches(res, { name, tag });
    return NextResponse.json({ data: matches });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Henrik API error";
    return NextResponse.json({ error: message }, { status });
  }
}
