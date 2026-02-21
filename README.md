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
    "mockapi": {
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
    "mockapi": {
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

```bash
npm run dev
```

Open http://localhost:5173 to use the Postman-like interface.

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
