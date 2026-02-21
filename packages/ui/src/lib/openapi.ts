import type { HttpMethod } from "@/types";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface OpenAPIPathItem {
  get?: unknown;
  post?: unknown;
  put?: unknown;
  patch?: unknown;
  delete?: unknown;
  [key: string]: unknown;
}

interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  paths?: Record<string, OpenAPIPathItem>;
}

export interface OpenAPIEndpointPayload {
  path: string;
  method: HttpMethod;
  statusCode: number;
  responseBody: unknown;
  description?: string;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function getDefaultResponseBody(method: HttpMethod): unknown {
  if (method === "GET") {
    return { id: "{{params.id}}", data: [] };
  }
  return { id: "{{params.id}}", success: true, message: "Created" };
}

export function parseOpenAPISpec(spec: OpenAPISpec): OpenAPIEndpointPayload[] {
  const result: OpenAPIEndpointPayload[] = [];
  const paths = spec.paths ?? {};

  for (const [pathTemplate, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    const path = normalizePath(pathTemplate);

    for (const method of HTTP_METHODS) {
      const op = pathItem[method.toLowerCase()] as Record<string, unknown> | undefined;
      if (!op) continue;

      const responses = op.responses as Record<string, { content?: Record<string, { example?: unknown; schema?: unknown }> }> | undefined;
      let statusCode = 200;
      let responseBody: unknown = getDefaultResponseBody(method as HttpMethod);

      if (responses) {
        const successResponse =
          responses["200"] ?? responses["201"] ?? Object.values(responses)[0];
        if (successResponse?.content?.["application/json"]?.example) {
          responseBody = successResponse.content["application/json"].example;
        } else if (successResponse?.content?.["application/json"]?.schema) {
          responseBody = { message: "Mock response" };
        }
        if (responses["201"]) statusCode = 201;
      }

      const description = typeof op.summary === "string" ? op.summary : (op.description as string);

      result.push({
        path,
        method: method as HttpMethod,
        statusCode,
        responseBody,
        description,
      });
    }
  }

  return result;
}
