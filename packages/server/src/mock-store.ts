import { ulid } from "ulid";
import path from "path";
import fs from "fs";
import type {
  MockEndpoint,
  CreateEndpointParams,
  UpdateEndpointParams,
  HttpMethod,
} from "./types.js";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "endpoints.json");

interface StorageData {
  endpoints: MockEndpoint[];
}

class MockStore {
  private endpoints: Map<string, MockEndpoint> = new Map();

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, "utf-8");
        const parsed: StorageData = JSON.parse(data);
        this.endpoints = new Map(
          parsed.endpoints.map((e) => [e.id, { ...e, enabled: e.enabled ?? true }])
        );
      }
    } catch (error) {
      console.error("Failed to load endpoints from file:", error);
      this.endpoints = new Map();
    }
  }

  /** Reload endpoints from disk (e.g. after another process added endpoints). */
  reloadFromFile(): void {
    this.loadFromFile();
  }

  private saveToFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const data: StorageData = {
        endpoints: Array.from(this.endpoints.values()),
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save endpoints to file:", error);
    }
  }

  create(params: CreateEndpointParams): MockEndpoint {
    const now = new Date().toISOString();
    const endpoint: MockEndpoint = {
      id: ulid(),
      path: this.normalizePath(params.path),
      method: params.method,
      statusCode: params.statusCode ?? 200,
      responseBody: params.responseBody ?? null,
      responseHeaders: params.responseHeaders ?? { "Content-Type": "application/json" },
      delay: params.delay,
      description: params.description,
      enabled: params.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.saveToFile();
    return endpoint;
  }

  update(params: UpdateEndpointParams): MockEndpoint | null {
    const endpoint = this.endpoints.get(params.id);
    if (!endpoint) {
      return null;
    }

    const updated: MockEndpoint = {
      ...endpoint,
      path: params.path !== undefined ? this.normalizePath(params.path) : endpoint.path,
      method: params.method ?? endpoint.method,
      statusCode: params.statusCode ?? endpoint.statusCode,
      responseBody: params.responseBody !== undefined ? params.responseBody : endpoint.responseBody,
      responseHeaders: params.responseHeaders ?? endpoint.responseHeaders,
      delay: params.delay !== undefined ? params.delay : endpoint.delay,
      description: params.description !== undefined ? params.description : endpoint.description,
      enabled: params.enabled !== undefined ? params.enabled : endpoint.enabled,
      updatedAt: new Date().toISOString(),
    };

    this.endpoints.set(params.id, updated);
    this.saveToFile();
    return updated;
  }

  delete(id: string): boolean {
    const result = this.endpoints.delete(id);
    if (result) {
      this.saveToFile();
    }
    return result;
  }

  get(id: string): MockEndpoint | null {
    return this.endpoints.get(id) ?? null;
  }

  getAll(): MockEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  findByPathAndMethod(path: string, method: HttpMethod): MockEndpoint | null {
    const normalizedPath = this.normalizePath(path);
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.enabled === false) continue;
      if (this.matchPath(endpoint.path, normalizedPath) && endpoint.method === method) {
        return endpoint;
      }
    }
    return null;
  }

  clear(): void {
    this.endpoints.clear();
    this.saveToFile();
  }

  count(): number {
    return this.endpoints.size;
  }

  private normalizePath(path: string): string {
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    if (path.endsWith("/") && path.length > 1) {
      path = path.slice(0, -1);
    }
    return path;
  }

  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(":")) {
        continue;
      }

      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  extractParams(pattern: string, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      if (patternPart.startsWith(":")) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }
}

export const mockStore = new MockStore();
