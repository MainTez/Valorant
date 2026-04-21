import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { henrikAccount } from "@/lib/henrik/client";
import { normalizeAccount } from "@/lib/henrik/normalize";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; tag: string }> },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, tag } = await params;
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const res = await henrikAccount(name, tag, { force });
    return NextResponse.json({ data: normalizeAccount(res) });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Henrik API error";
    return NextResponse.json({ error: message }, { status });
  }
}
