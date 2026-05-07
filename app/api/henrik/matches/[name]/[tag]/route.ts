import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { henrikAllStoredMatches } from "@/lib/henrik/client";
import { normalizeStoredMatches } from "@/lib/henrik/normalize";

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
  try {
    const res = await henrikAllStoredMatches(name, tag, region ?? "eu", { force });
    const matches = normalizeStoredMatches(res);
    return NextResponse.json({ data: matches, results: res.results, errors: res.errors ?? [] });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Henrik API error";
    return NextResponse.json({ error: message }, { status });
  }
}
