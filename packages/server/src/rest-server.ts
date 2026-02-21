import express, { Request, Response, NextFunction } from "express";
import { Server } from "http";
import { mockStore } from "./mock-store.js";
import type { HttpMethod, ServerStatus, CreateEndpointParams } from "./types.js";

class RestServer {
  private app: express.Application;
  private server: Server | null = null;
  private currentPort: number | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
      }

      next();
    });
  }

  private setupRoutes(): void {
    this.app.get("/__mockapi/health", (_req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    this.app.get("/__mockapi/endpoints", (_req: Request, res: Response) => {
      mockStore.reloadFromFile();
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.json(mockStore.getAll());
    });

    this.app.post("/__mockapi/endpoints", (req: Request, res: Response) => {
      try {
        const body = req.body as CreateEndpointParams;
        if (!body.path || !body.method) {
          res.status(400).json({ error: "path and method are required" });
          return;
        }
        const endpoint = mockStore.create(body);
        res.status(201).json(endpoint);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Invalid request",
        });
      }
    });

    this.app.patch("/__mockapi/endpoints/:id", (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const endpoint = mockStore.update({
        id,
        path: body.path as string | undefined,
        method: body.method as import("./types.js").HttpMethod | undefined,
        statusCode: body.statusCode as number | undefined,
        responseBody: body.responseBody,
        responseHeaders: body.responseHeaders as Record<string, string> | undefined,
        delay: body.delay as number | undefined,
        description: body.description as string | undefined,
        enabled: body.enabled as boolean | undefined,
      });
      if (!endpoint) {
        res.status(404).json({ error: "Endpoint not found" });
        return;
      }
      res.json(endpoint);
    });

    this.app.delete("/__mockapi/endpoints/:id", (req: Request, res: Response) => {
      const { id } = req.params;
      const deleted = mockStore.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Endpoint not found" });
        return;
      }
      res.status(204).send();
    });

    this.app.use((req: Request, res: Response) => {
      this.handleMockRequest(req, res);
    });
  }

  private async handleMockRequest(req: Request, res: Response): Promise<void> {
    const method = req.method.toUpperCase() as HttpMethod;
    const path = req.path;

    const endpoint = mockStore.findByPathAndMethod(path, method);

    if (!endpoint) {
      res.status(404).json({
        error: "Not Found",
        message: `No mock endpoint configured for ${method} ${path}`,
        availableEndpoints: mockStore.getAll().map((e) => ({
          method: e.method,
          path: e.path,
        })),
      });
      return;
    }

    if (endpoint.delay && endpoint.delay > 0) {
      await this.delay(endpoint.delay);
    }

    Object.entries(endpoint.responseHeaders).forEach(([key, value]) => {
      res.header(key, value);
    });

    const params = mockStore.extractParams(endpoint.path, path);

    let responseBody = endpoint.responseBody;
    
    if (typeof responseBody === "string") {
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
        responseBody = this.interpolateParams(responseBody, {
          params,
          query: req.query as Record<string, string>,
          body: req.body,
        });
        res.status(endpoint.statusCode).send(responseBody);
        return;
      }
    }
    
    if (typeof responseBody === "object" && responseBody !== null) {
      responseBody = this.interpolateParams(responseBody, {
        params,
        query: req.query as Record<string, string>,
        body: req.body,
      });
    }

    res.status(endpoint.statusCode).json(responseBody);
  }

  private interpolateParams(
    obj: unknown,
    context: { params: Record<string, string>; query: Record<string, string>; body: unknown }
  ): unknown {
    if (typeof obj === "string") {
      return obj.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match, type, key) => {
        if (type === "params" && context.params[key]) {
          return context.params[key];
        }
        if (type === "query" && context.query[key]) {
          return context.query[key];
        }
        if (type === "body" && typeof context.body === "object" && context.body !== null) {
          return (context.body as Record<string, unknown>)[key]?.toString() ?? "";
        }
        return "";
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateParams(item, context));
    }

    if (typeof obj === "object" && obj !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateParams(value, context);
      }
      return result;
    }

    return obj;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  start(port: number = 3000): Promise<ServerStatus> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve(this.getStatus());
        return;
      }

      this.server = this.app.listen(port, () => {
        this.currentPort = port;
        resolve(this.getStatus());
      });

      this.server.on("error", (err: NodeJS.ErrnoException) => {
        this.server = null;
        this.currentPort = null;
        reject(new Error(`Failed to start server: ${err.message}`));
      });
    });
  }

  stop(): Promise<ServerStatus> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve(this.getStatus());
        return;
      }

      this.server.close(() => {
        this.server = null;
        this.currentPort = null;
        resolve(this.getStatus());
      });
    });
  }

  getStatus(): ServerStatus {
    return {
      running: this.server !== null,
      port: this.currentPort,
      endpointCount: mockStore.count(),
      baseUrl: this.currentPort ? `http://localhost:${this.currentPort}` : null,
    };
  }
}

export const restServer = new RestServer();
