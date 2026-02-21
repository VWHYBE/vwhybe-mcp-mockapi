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

export interface CreateEndpointParams {
  path: string;
  method: HttpMethod;
  statusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  delay?: number;
  description?: string;
  enabled?: boolean;
}

export interface UpdateEndpointParams {
  id: string;
  path?: string;
  method?: HttpMethod;
  statusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  delay?: number;
  description?: string;
  enabled?: boolean;
}

export interface ServerStatus {
  running: boolean;
  port: number | null;
  endpointCount: number;
  baseUrl: string | null;
}
