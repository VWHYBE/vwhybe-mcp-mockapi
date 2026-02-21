export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface MockEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  statusCode: number;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  delay?: number;
  description?: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestHistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  requestBody?: string;
  requestHeaders?: string;
  status: number;
  duration: number;
  timestamp: string;
}

export interface ServerStatus {
  running: boolean;
  port: number | null;
  endpointCount: number;
  baseUrl: string | null;
}

export interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}
