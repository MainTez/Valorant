import "server-only";
import { getCached, setCached } from "./cache";
import {
  type HenrikRegion,
  defaultRegion,
  normalizeRegion,
} from "./regions";
import type {
  HenrikAccountResponse,
  HenrikMMRResponse,
  HenrikMatchDetailsResponse,
  HenrikMatchResponse,
  HenrikMmrHistoryResponse,
  HenrikStoredMatchesResponse,
} from "./types";
import { HENRIK_CACHE_TTLS } from "@/lib/constants";

const BASE = "https://api.henrikdev.xyz/valorant";
const STORED_MATCH_PAGE_SIZE = 10;
const STORED_MATCH_MAX_PAGES = 500;

export class HenrikApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface FetchOpts {
  cacheKey: string;
  ttlSeconds: number;
  force?: boolean;
}

async function henrikFetch<T>(
  path: string,
  { cacheKey, ttlSeconds, force }: FetchOpts,
): Promise<T> {
  if (!force) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const url = `${BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (process.env.HENRIK_API_KEY) {
    headers.Authorization = process.env.HENRIK_API_KEY;
  }

  let attempt = 0;
  const maxAttempts = 3;
  let lastErr: unknown = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(t);

      if (res.status === 429 || res.status >= 500) {
        lastErr = new HenrikApiError(
          `Henrik API transient error ${res.status}`,
          res.status,
        );
        await new Promise((r) => setTimeout(r, 250 * attempt * attempt));
        continue;
      }

      if (!res.ok) {
        let bodyText: string | unknown = await res.text().catch(() => "");
        try {
          bodyText = JSON.parse(bodyText as string);
        } catch {
          /* keep as text */
        }
        throw new HenrikApiError(
          `Henrik API ${res.status}`,
          res.status,
          bodyText,
        );
      }

      const json = (await res.json()) as T;
      await setCached(cacheKey, json, ttlSeconds);
      return json;
    } catch (err) {
      lastErr = err;
      if (err instanceof HenrikApiError && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 250 * attempt * attempt));
    }
  }
  throw lastErr ?? new HenrikApiError("Henrik API failed", 0);
}

function encodeName(name: string): string {
  return encodeURIComponent(name.trim());
}

export async function henrikAccount(
  name: string,
  tag: string,
  opts: { force?: boolean } = {},
): Promise<HenrikAccountResponse> {
  const key = `account:${name.toLowerCase()}#${tag.toLowerCase()}`;
  return henrikFetch<HenrikAccountResponse>(
    `/v1/account/${encodeName(name)}/${encodeName(tag)}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.account, force: opts.force },
  );
}

export async function henrikMMR(
  name: string,
  tag: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean } = {},
): Promise<HenrikMMRResponse> {
  const r = normalizeRegion(region);
  const key = `mmr:${r}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  return henrikFetch<HenrikMMRResponse>(
    `/v2/mmr/${r}/${encodeName(name)}/${encodeName(tag)}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.mmr, force: opts.force },
  );
}

export async function henrikMatches(
  name: string,
  tag: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean; size?: number; mode?: string } = {},
): Promise<HenrikMatchResponse> {
  const r = normalizeRegion(region);
  const qs = new URLSearchParams();
  if (opts.size) qs.set("size", String(opts.size));
  if (opts.mode) qs.set("mode", opts.mode);
  const q = qs.toString();
  const key = `matches:${r}:${name.toLowerCase()}#${tag.toLowerCase()}:${q}`;
  return henrikFetch<HenrikMatchResponse>(
    `/v3/matches/${r}/${encodeName(name)}/${encodeName(tag)}${q ? `?${q}` : ""}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.matches, force: opts.force },
  );
}

export async function henrikStoredMatchesPage(
  name: string,
  tag: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean; size?: number; page?: number; mode?: string; map?: string } = {},
): Promise<HenrikStoredMatchesResponse> {
  const r = normalizeRegion(region);
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const size = Math.min(STORED_MATCH_PAGE_SIZE, Math.max(1, Math.floor(opts.size ?? STORED_MATCH_PAGE_SIZE)));
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("size", String(size));
  if (opts.mode) qs.set("mode", opts.mode);
  if (opts.map) qs.set("map", opts.map);
  const q = qs.toString();
  const key = `stored-matches:${r}:${name.toLowerCase()}#${tag.toLowerCase()}:${q}`;
  return henrikFetch<HenrikStoredMatchesResponse>(
    `/v1/stored-matches/${r}/${encodeName(name)}/${encodeName(tag)}?${q}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.matches, force: opts.force },
  );
}

export async function henrikAllStoredMatches(
  name: string,
  tag: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean; mode?: string; map?: string; maxPages?: number } = {},
): Promise<HenrikStoredMatchesResponse> {
  const data: NonNullable<HenrikStoredMatchesResponse["data"]> = [];
  const errors: NonNullable<HenrikStoredMatchesResponse["errors"]> = [];
  let page = 1;
  let lastResults: HenrikStoredMatchesResponse["results"] | undefined;
  const maxPages = Math.max(1, Math.floor(opts.maxPages ?? STORED_MATCH_MAX_PAGES));

  while (page <= maxPages) {
    try {
      const response = await henrikStoredMatchesPage(name, tag, region, {
        force: opts.force,
        size: STORED_MATCH_PAGE_SIZE,
        page,
        mode: opts.mode,
        map: opts.map,
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      const returned = response.results?.returned ?? rows.length;
      lastResults = response.results;

      if (rows.length === 0 || returned === 0) break;

      data.push(...rows);

      const after = response.results?.after ?? 0;
      if (after <= 0) break;

      page++;
    } catch (err) {
      errors.push({
        page,
        message: err instanceof Error ? err.message : "Henrik stored match page failed",
      });
      break;
    }
  }

  data.sort((left, right) => {
    const leftTime = new Date(left.meta?.started_at ?? "").getTime();
    const rightTime = new Date(right.meta?.started_at ?? "").getTime();
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });

  return {
    status: errors.length ? 206 : 200,
    name,
    tag,
    results: {
      total: lastResults?.total ?? data.length,
      returned: data.length,
      before: lastResults?.before ?? 0,
      after: lastResults?.after ?? 0,
    },
    data,
    errors: errors.length ? errors : undefined,
  };
}

export async function henrikMatchDetails(
  matchId: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean } = {},
): Promise<HenrikMatchDetailsResponse> {
  const r = normalizeRegion(region);
  const key = `match-details:${r}:${matchId}`;
  return henrikFetch<HenrikMatchDetailsResponse>(
    `/v2/match/${encodeName(matchId)}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.matches, force: opts.force },
  );
}

export async function henrikMmrHistory(
  name: string,
  tag: string,
  region: HenrikRegion | string = defaultRegion(),
  opts: { force?: boolean } = {},
): Promise<HenrikMmrHistoryResponse> {
  const r = normalizeRegion(region);
  const key = `mmr-history:${r}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  return henrikFetch<HenrikMmrHistoryResponse>(
    `/v1/mmr-history/${r}/${encodeName(name)}/${encodeName(tag)}`,
    { cacheKey: key, ttlSeconds: HENRIK_CACHE_TTLS.mmrHistory, force: opts.force },
  );
}
