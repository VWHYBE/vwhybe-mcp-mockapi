# MCP Mock API Server

An MCP (Model Context Protocol) server that creates and manages mock REST APIs, with a beautiful Postman-like UI for testing endpoints.

## Features

- **MCP Server**: Create and manage mock endpoints via MCP tools
- **REST API**: Serve mock endpoints as a real REST API
- **Web UI**: Postman-like interface for testing endpoints
- **Path Parameters**: Support for dynamic path parameters (e.g., `/users/:id`)
- **Response Interpolation**: Use `{{params.x}}`, `{{query.x}}`, `{{body.x}}` in responses
- **Configurable**: Set status codes, headers, response bodies, and delays

## Project Structure

```
vwhybe-mcp-mockapi/
├── packages/
│   ├── server/          # MCP server + REST API
│   │   ├── src/
│   │   │   ├── index.ts       # MCP server entry point
│   │   │   ├── rest-server.ts # Express REST server
│   │   │   ├── mock-store.ts  # In-memory endpoint store
│   │   │   └── types.ts       # TypeScript types
│   │   └── package.json
│   └── ui/              # React web UI
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── App.tsx        # Main app component
│       │   └── api.ts         # API client
│       └── package.json
└── package.json         # Root workspace config
```

## Installation

```bash
npm install
```

## Usage

### 1. Configure MCP Server

Add to your Cursor MCP settings

**Option A – Dynamic (recommended)**  
Runs the server via npm from your workspace root so no path is hardcoded. Use this when the MCP config is for this repo and Cursor uses the project as the workspace:

```json
{
  "mcpServers": {
    "user-mockapi": {
      "command": "npm",
      "args": ["run", "start", "--workspace=@vwhybe/mcp-mockapi-server"]
    }
  }
}
```

Build the server once before using MCP:  
`npm run build --workspace=packages/server` or `npm run build`.

**Option B – Node with path**  
Use when the MCP config is global or the process is not started from this repo. Replace `"YOUR_REPO_PATH"` with the absolute path to your `vwhybe-mcp-mockapi` clone:

```json
{
  "mcpServers": {
    "user-mockapi": {
      "command": "node",
      "args": ["YOUR_REPO_PATH/packages/server/dist/index.js"]
    }
  }
}
```

Example on macOS/Linux: `"/Users/you/Worklab/vwhybe-mcp-mockapi/packages/server/dist/index.js"`. Build the server first (`npm run build` from repo root).

### 2. Start the REST Server

Use the MCP tool `start_server` to start the REST API server:

```
Tool: start_server
Parameters: { "port": 3000 }
```

### 3. Create Mock Endpoints

Use the MCP tool `create_endpoint`:

```json
{
  "path": "/api/users/:id",
  "method": "GET",
  "statusCode": 200,
  "responseBody": {
    "id": "{{params.id}}",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### 4. Start the UI

From the repo root run:

```bash
npm run dev
```

This starts the **HTTP mock API server** (test-server) and the UI. The UI proxies `/__mockapi` to that server. Open http://localhost:3010 (or the port Vite prints) to use the Postman-like interface.

**If you see `ECONNREFUSED` / proxy error:** the UI is trying to reach the mock API but no HTTP server is running. Use `npm run dev` (which starts the HTTP server), not the MCP server alone. The message "MCP Mock API server running on stdio" means the MCP protocol server is running; it does **not** start the HTTP API. For the UI you need the HTTP server (started by `npm run dev` or by the MCP tool `start_server` and then the UI with the same port).

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `create_endpoint` | Create a new mock API endpoint |
| `update_endpoint` | Update an existing endpoint |
| `delete_endpoint` | Delete an endpoint |
| `list_endpoints` | List all configured endpoints |
| `clear_endpoints` | Remove all endpoints |
| `start_server` | Start the REST server |
| `stop_server` | Stop the REST server |
| `server_status` | Get server status |

## Response Interpolation

Use template variables in response bodies:

- `{{params.paramName}}` - URL path parameters
- `{{query.paramName}}` - Query string parameters
- `{{body.fieldName}}` - Request body fields

## Troubleshooting: "Connection closed" / "No server info found"

Those errors mean the MCP process exited before Cursor could connect. Common causes and fixes:

1. **Build the server first**  
   From the repo root:  
   `npm run build` or `npm run build --workspace=packages/server`  
   Ensure `packages/server/dist/index.js` exists.

2. **User-level (global) MCP config**  
   If **user-mockapi** is in Cursor’s **user** MCP settings, the process is started from Cursor’s default directory, not this repo. The `npm run start --workspace=...` command then fails because there is no workspace there.  
   **Fix:** Use **Option B** in Cursor’s MCP config: set `command` to `node` and `args` to the **absolute path** to the built entry point, e.g.  
   `["/Users/femto/Worklab/vwhybe-mcp-mockapi/packages/server/dist/index.js"]`  
   (replace with your real repo path). No `cwd` change is needed.

3. **Workspace MCP config**  
   If you use **Option A** (npm workspace), open the **vwhybe-mcp-mockapi** folder as the Cursor workspace (File → Open Folder) so the npm command runs from the repo root.

4. **See the real error**  
   From the repo root run:  
   `npm run inspect`  
   This starts the MCP with the MCP inspector so you can see any crash or stderr output when the server starts.

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start UI development server
npm run dev

# Start MCP server in watch mode
npm run dev:server

# Run MCP inspector
npm run inspect
```

## UI Features

- **Endpoint List**: View all configured mock endpoints
- **Request Tester**: Send requests with custom headers and body
- **Response Viewer**: See response body, headers, and timing
- **Endpoint Details**: View endpoint configuration

## License

MIT
