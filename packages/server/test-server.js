#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const { ulid } = require('ulid');

const app = express();

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'endpoints.json');

let endpoints = new Map();

function loadFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      endpoints = new Map(parsed.endpoints.map(e => [e.id, { ...e, enabled: e.enabled !== false }]));
    }
  } catch (error) {
    console.error('Failed to load endpoints:', error);
    endpoints = new Map();
  }
}

function saveToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = { endpoints: Array.from(endpoints.values()) };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save endpoints:', error);
  }
}

loadFromFile();

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

function interpolate(obj, context) {
  if (typeof obj === "string") {
    return obj.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, type, key) => {
      if (type === "params" && context.params?.[key]) return context.params[key];
      if (type === "query" && context.query?.[key]) return context.query[key];
      if (type === "body" && context.body?.[key]) return String(context.body[key]);
      return "";
    });
  }
  if (Array.isArray(obj)) return obj.map(item => interpolate(item, context));
  if (typeof obj === "object" && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolate(value, context);
    }
    return result;
  }
  return obj;
}

function normalizePath(p) {
  if (!p.startsWith("/")) p = "/" + p;
  if (p.endsWith("/") && p.length > 1) p = p.slice(0, -1);
  return p;
}

function matchPath(pattern, reqPath) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = reqPath.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) continue;
    if (patternParts[i] !== pathParts[i]) return false;
  }
  return true;
}

function extractParams(pattern, reqPath) {
  const params = {};
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = reqPath.split("/").filter(Boolean);
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    }
  }
  return params;
}

function getAllEndpoints() {
  return Array.from(endpoints.values());
}

function findEndpoint(reqPath, method) {
  const normalized = normalizePath(reqPath);
  for (const ep of endpoints.values()) {
    if (ep.enabled === false) continue;
    if (matchPath(ep.path, normalized) && ep.method === method) {
      return ep;
    }
  }
  return null;
}

app.get("/__mockapi/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/__mockapi/endpoints", (req, res) => {
  loadFromFile();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.json(getAllEndpoints());
});

app.post("/__mockapi/endpoints", (req, res) => {
  const { path: p, method, statusCode = 200, responseBody, responseHeaders, delay, description, enabled } = req.body;
  const now = new Date().toISOString();
  const endpoint = {
    id: ulid(),
    path: normalizePath(p),
    method,
    statusCode,
    responseBody: responseBody ?? null,
    responseHeaders: responseHeaders ?? { "Content-Type": "application/json" },
    delay,
    description,
    enabled: enabled !== false,
    createdAt: now,
    updatedAt: now
  };
  
  endpoints.set(endpoint.id, endpoint);
  saveToFile();
  res.status(201).json(endpoint);
});

app.patch("/__mockapi/endpoints/:id", (req, res) => {
  const ep = endpoints.get(req.params.id);
  if (!ep) return res.status(404).json({ error: "Endpoint not found" });
  const { path: p, method, statusCode, responseBody, responseHeaders, delay, description, enabled } = req.body;
  const updated = {
    ...ep,
    ...(p !== undefined && { path: normalizePath(p) }),
    ...(method !== undefined && { method }),
    ...(statusCode !== undefined && { statusCode }),
    ...(responseBody !== undefined && { responseBody }),
    ...(responseHeaders !== undefined && { responseHeaders }),
    ...(delay !== undefined && { delay }),
    ...(description !== undefined && { description }),
    ...(enabled !== undefined && { enabled }),
    updatedAt: new Date().toISOString()
  };
  endpoints.set(ep.id, updated);
  saveToFile();
  res.json(updated);
});

app.delete("/__mockapi/endpoints/:id", (req, res) => {
  const deleted = endpoints.delete(req.params.id);
  if (deleted) saveToFile();
  res.json({ success: deleted });
});

app.use((req, res) => {
  const method = req.method.toUpperCase();
  const endpoint = findEndpoint(req.path, method);

  if (!endpoint) {
    res.status(404).json({
      error: "Not Found",
      message: `No mock endpoint configured for ${method} ${req.path}`,
      availableEndpoints: getAllEndpoints().map(e => ({ method: e.method, path: e.path })),
    });
    return;
  }

  const params = extractParams(endpoint.path, req.path);
  
  let responseBody = endpoint.responseBody;
  if (typeof responseBody === "string") {
    try {
      responseBody = JSON.parse(responseBody);
    } catch {}
  }
  
  const interpolated = interpolate(responseBody, {
    params,
    query: req.query,
    body: req.body,
  });

  Object.entries(endpoint.responseHeaders).forEach(([key, value]) => {
    res.header(key, value);
  });

  if (endpoint.delay) {
    setTimeout(() => {
      res.status(endpoint.statusCode).json(interpolated);
    }, endpoint.delay);
  } else {
    res.status(endpoint.statusCode).json(interpolated);
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Mock API server running on http://localhost:${port}`);
  console.log(`Data file: ${DB_PATH}`);
  console.log(`Endpoints: ${endpoints.size}`);
});

process.on('SIGINT', () => {
  process.exit(0);
});
