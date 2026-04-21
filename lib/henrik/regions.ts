export const HENRIK_REGIONS = ["eu", "na", "ap", "kr", "latam", "br"] as const;
export type HenrikRegion = (typeof HENRIK_REGIONS)[number];

export function defaultRegion(): HenrikRegion {
  const raw = (process.env.HENRIK_REGION_DEFAULT || "eu").toLowerCase();
  return (HENRIK_REGIONS as readonly string[]).includes(raw)
    ? (raw as HenrikRegion)
    : "eu";
}

export function normalizeRegion(input: string | null | undefined): HenrikRegion {
  if (!input) return defaultRegion();
  const raw = input.toLowerCase();
  return (HENRIK_REGIONS as readonly string[]).includes(raw)
    ? (raw as HenrikRegion)
    : defaultRegion();
}
