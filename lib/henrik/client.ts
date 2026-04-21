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
  HenrikMatchResponse,
  HenrikMmrHistoryResponse,
} from "./types";
import { HENRIK_CACHE_TTLS } from "@/lib/constants";

const BASE = "https://api.henrikdev.xyz/valorant";

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
  if (opts.mode) qs.set("filter", opts.mode);
  const q = qs.toString();
  const key = `matches:${r}:${name.toLowerCase()}#${tag.toLowerCase()}:${q}`;
  return henrikFetch<HenrikMatchResponse>(
    `/v3/matches/${r}/${encodeName(name)}/${encodeName(tag)}${q ? `?${q}` : ""}`,
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
