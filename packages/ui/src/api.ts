import type { MockEndpoint, TestResponse, HttpMethod } from "./types";

const API_BASE = "/__mockapi";

export const fetchEndpoints = async (): Promise<MockEndpoint[]> => {
  const response = await fetch(`${API_BASE}/endpoints?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch endpoints");
  }
  return response.json();
};

export interface CreateEndpointPayload {
  path: string;
  method: HttpMethod;
  statusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  delay?: number;
  description?: string;
  enabled?: boolean;
}

export const createEndpoint = async (
  payload: CreateEndpointPayload
): Promise<MockEndpoint> => {
  const response = await fetch(`${API_BASE}/endpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create endpoint");
  }
  return response.json();
};

export const updateEndpoint = async (
  id: string,
  payload: Partial<CreateEndpointPayload> & { enabled?: boolean }
): Promise<MockEndpoint> => {
  const response = await fetch(`${API_BASE}/endpoints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Endpoint not found");
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to update endpoint");
  }
  return response.json();
};

export const deleteEndpoint = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/endpoints/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Endpoint not found");
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to delete endpoint");
  }
};

export const testEndpoint = async (
  method: HttpMethod,
  pathOrUrl: string,
  body?: unknown,
  headers?: Record<string, string>,
  baseUrl?: string
): Promise<TestResponse> => {
  const startTime = performance.now();
  const url =
    pathOrUrl.startsWith("http") || !baseUrl
      ? pathOrUrl
      : `${baseUrl.replace(/\/$/, "")}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const duration = performance.now() - startTime;

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let responseBody: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    duration,
  };
};
