#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { mockStore } from "./mock-store.js";
import { restServer } from "./rest-server.js";
import type { HttpMethod } from "./types.js";

const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const CreateEndpointSchema = z.object({
  path: z.string().describe("The URL path for the endpoint (e.g., /api/users/:id)"),
  method: HttpMethodSchema.describe("HTTP method"),
  statusCode: z.number().optional().default(200).describe("HTTP status code to return"),
  responseBody: z.unknown().optional().describe("Response body (JSON)"),
  responseHeaders: z
    .record(z.string())
    .optional()
    .describe("Custom response headers"),
  delay: z.number().optional().describe("Response delay in milliseconds"),
  description: z.string().optional().describe("Description of this endpoint"),
});

const UpdateEndpointSchema = z.object({
  id: z.string().describe("The ID of the endpoint to update"),
  path: z.string().optional().describe("The URL path for the endpoint"),
  method: HttpMethodSchema.optional().describe("HTTP method"),
  statusCode: z.number().optional().describe("HTTP status code to return"),
  responseBody: z.unknown().optional().describe("Response body (JSON)"),
  responseHeaders: z.record(z.string()).optional().describe("Custom response headers"),
  delay: z.number().optional().describe("Response delay in milliseconds"),
  description: z.string().optional().describe("Description of this endpoint"),
});

const DeleteEndpointSchema = z.object({
  id: z.string().describe("The ID of the endpoint to delete"),
});

const StartServerSchema = z.object({
  port: z.number().optional().default(3000).describe("Port to run the server on"),
});

const server = new Server(
  {
    name: "mcp-mockapi",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_endpoint",
        description:
          "Create a new mock API endpoint. Supports path parameters (e.g., /users/:id) and response interpolation using {{params.id}}, {{query.name}}, or {{body.field}}.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The URL path for the endpoint (e.g., /api/users/:id)",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
              description: "HTTP method",
            },
            statusCode: {
              type: "number",
              description: "HTTP status code to return (default: 200)",
            },
            responseBody: {
              description: "Response body (JSON). Use {{params.x}}, {{query.x}}, {{body.x}} for interpolation",
            },
            responseHeaders: {
              type: "object",
              description: "Custom response headers",
            },
            delay: {
              type: "number",
              description: "Response delay in milliseconds",
            },
            description: {
              type: "string",
              description: "Description of this endpoint",
            },
          },
          required: ["path", "method"],
        },
      },
      {
        name: "update_endpoint",
        description: "Update an existing mock API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the endpoint to update",
            },
            path: {
              type: "string",
              description: "The URL path for the endpoint",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
              description: "HTTP method",
            },
            statusCode: {
              type: "number",
              description: "HTTP status code to return",
            },
            responseBody: {
              description: "Response body (JSON)",
            },
            responseHeaders: {
              type: "object",
              description: "Custom response headers",
            },
            delay: {
              type: "number",
              description: "Response delay in milliseconds",
            },
            description: {
              type: "string",
              description: "Description of this endpoint",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_endpoint",
        description: "Delete a mock API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the endpoint to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_endpoints",
        description: "List all configured mock API endpoints",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "clear_endpoints",
        description: "Remove all mock API endpoints",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "start_server",
        description: "Start the mock API REST server",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "number",
              description: "Port to run the server on (default: 3000)",
            },
          },
        },
      },
      {
        name: "stop_server",
        description: "Stop the mock API REST server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "server_status",
        description: "Get the current status of the mock API server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_endpoint": {
        const params = CreateEndpointSchema.parse(args);
        const endpoint = mockStore.create({
          path: params.path,
          method: params.method as HttpMethod,
          statusCode: params.statusCode,
          responseBody: params.responseBody,
          responseHeaders: params.responseHeaders,
          delay: params.delay,
          description: params.description,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Endpoint created successfully",
                  endpoint,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "update_endpoint": {
        const params = UpdateEndpointSchema.parse(args);
        const endpoint = mockStore.update({
          id: params.id,
          path: params.path,
          method: params.method as HttpMethod | undefined,
          statusCode: params.statusCode,
          responseBody: params.responseBody,
          responseHeaders: params.responseHeaders,
          delay: params.delay,
          description: params.description,
        });
        if (!endpoint) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    message: `Endpoint with ID ${params.id} not found`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Endpoint updated successfully",
                  endpoint,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "delete_endpoint": {
        const params = DeleteEndpointSchema.parse(args);
        const deleted = mockStore.delete(params.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: deleted,
                  message: deleted
                    ? "Endpoint deleted successfully"
                    : `Endpoint with ID ${params.id} not found`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_endpoints": {
        const endpoints = mockStore.getAll();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: endpoints.length,
                  endpoints,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "clear_endpoints": {
        const count = mockStore.count();
        mockStore.clear();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Cleared ${count} endpoint(s)`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "start_server": {
        const params = StartServerSchema.parse(args);
        const status = await restServer.start(params.port);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Server started on port ${status.port}`,
                  status,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "stop_server": {
        const status = await restServer.stop();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Server stopped",
                  status,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "server_status": {
        const status = restServer.getStatus();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }
    throw error;
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Mock API server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
