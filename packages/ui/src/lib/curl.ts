import type { HttpMethod } from "@/types";

const escapeSingleQuotes = (s: string): string => s.replace(/'/g, "'\\''");

export const buildCurl = (
  method: HttpMethod,
  path: string,
  baseUrl: string,
  headers: Record<string, string>,
  body: string | undefined
): string => {
  const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const parts = ["curl", "-X", method, `'${escapeSingleQuotes(url)}'`];

  Object.entries(headers).forEach(([key, value]) => {
    if (key && value) {
      parts.push("-H", `'${escapeSingleQuotes(`${key}: ${value}`)}'`);
    }
  });

  if (body && method !== "GET" && body.trim()) {
    try {
      JSON.parse(body);
      parts.push("-d", `'${escapeSingleQuotes(body)}'`);
    } catch {
      parts.push("-d", `'${escapeSingleQuotes(body)}'`);
    }
  }

  return parts.join(" ");
};
