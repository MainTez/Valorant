import packageJson from "@/package.json";

export const DESKTOP_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || packageJson.nexus.appUrl;

export const DESKTOP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  packageJson.nexus.desktopDownloadUrl;

