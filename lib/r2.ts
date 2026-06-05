import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_VOD_STORAGE_PREFIX } from "@/lib/vods";

const R2_SIGNED_URL_TTL_SECONDS = 60 * 60;

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null | undefined;

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export async function createR2VodSignedUpload({
  contentType,
  key,
}: {
  contentType: string;
  key: string;
}) {
  const config = requireR2Config();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    ContentType: contentType,
    Key: key,
  });

  return {
    headers: { "Content-Type": contentType },
    path: toR2VodStoragePath(key),
    provider: "r2" as const,
    uploadUrl: await getSignedUrl(client, command, {
      expiresIn: R2_SIGNED_URL_TTL_SECONDS,
    }),
  };
}

export async function createR2VodSignedUrl(key: string): Promise<string> {
  const config = requireR2Config();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_SIGNED_URL_TTL_SECONDS,
  });
}

export async function deleteR2VodObject(key: string): Promise<void> {
  const config = requireR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export function parseR2VodStoragePath(path: string): string | null {
  if (!path.startsWith(R2_VOD_STORAGE_PREFIX)) return null;
  const key = path.slice(R2_VOD_STORAGE_PREFIX.length);
  return key.length > 0 ? key : null;
}

function toR2VodStoragePath(key: string): string {
  return `${R2_VOD_STORAGE_PREFIX}${key}`;
}

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;
  const config = requireR2Config();
  cachedClient = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });
  return cachedClient;
}

function requireR2Config(): R2Config {
  const config = getR2Config();
  if (!config) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  return config;
}

function getR2Config(): R2Config | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const values = [accountId, accessKeyId, secretAccessKey, bucket];

  if (values.every(Boolean)) {
    cachedConfig = {
      accountId: accountId as string,
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
      bucket: bucket as string,
    };
    return cachedConfig;
  }

  if (values.some(Boolean)) {
    throw new Error(
      "Cloudflare R2 configuration is incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
    );
  }

  cachedConfig = null;
  return cachedConfig;
}
