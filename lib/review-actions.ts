export type ReviewActionSourceType = "match" | "vod" | "clip";

export interface ReviewActionSource {
  href: string;
  label: string;
  meta?: string[];
  type: ReviewActionSourceType;
}

export interface ParsedReviewAction {
  body: string;
  href: string | null;
  label: string | null;
  type: ReviewActionSourceType | null;
}

const REVIEW_ACTION_MARKER = "[review-action]";
const SOURCE_TYPE_LABEL: Record<ReviewActionSourceType, string> = {
  clip: "Clip",
  match: "Match",
  vod: "VOD",
};

const LABEL_TO_SOURCE_TYPE: Record<string, ReviewActionSourceType> = {
  clip: "clip",
  match: "match",
  vod: "vod",
};

export function buildReviewActionDescription({
  body,
  source,
}: {
  body: string;
  source: ReviewActionSource;
}): string {
  const cleanBody = body.trim();
  const metaLines =
    source.meta
      ?.map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`) ?? [];

  const lines = [
    cleanBody,
    "",
    REVIEW_ACTION_MARKER,
    `Type: ${SOURCE_TYPE_LABEL[source.type]}`,
    `Source: ${source.label.trim()}`,
    `Open: ${source.href.trim()}`,
  ];

  if (metaLines.length > 0) {
    lines.push("Context:", ...metaLines);
  }

  return lines.join("\n").trim();
}

export function parseReviewActionDescription(
  description: string | null | undefined,
): ParsedReviewAction | null {
  if (!description?.includes(REVIEW_ACTION_MARKER)) return null;

  const [bodyPart, sourcePart = ""] = description.split(REVIEW_ACTION_MARKER);
  const href = sourcePart.match(/^Open:\s*(\/\S+)/m)?.[1] ?? null;
  const label = sourcePart.match(/^Source:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const typeLabel = sourcePart.match(/^Type:\s*(.+)$/m)?.[1]?.trim().toLowerCase() ?? "";

  return {
    body: bodyPart.trim(),
    href,
    label,
    type: LABEL_TO_SOURCE_TYPE[typeLabel] ?? null,
  };
}
