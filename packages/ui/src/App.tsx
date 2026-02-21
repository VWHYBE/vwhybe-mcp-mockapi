import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EndpointList } from "@/components/EndpointList";
import { RequestTester } from "@/components/RequestTester";
import { EndpointDetails } from "@/components/EndpointDetails";
import { ImportOpenAPIDialog } from "@/components/ImportOpenAPIDialog";
import { fetchEndpoints, createEndpoint, updateEndpoint, deleteEndpoint } from "@/api";
import {
  getEndpointsFromIndexedDB,
  saveEndpointsToIndexedDB,
} from "@/lib/indexed-db";
import { downloadPostmanCollection } from "@/lib/postman";
import type { MockEndpoint } from "@/types";
import { RefreshCw, Server, ServerOff, Download, FileInput } from "lucide-react";

const BASE_URL_KEY = "mockapi-baseUrl";
const DEFAULT_BASE_URL = "http://localhost:3000";

const App = () => {
  const [endpoints, setEndpoints] = useState<MockEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<MockEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_BASE_URL;
    return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
  });
  const [importOpen, setImportOpen] = useState(false);

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return endpoints;
    const q = searchQuery.trim().toLowerCase();
    return endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
    );
  }, [endpoints, searchQuery]);

  useEffect(() => {
    localStorage.setItem(BASE_URL_KEY, baseUrl);
  }, [baseUrl]);

  const loadEndpoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoints();
      setEndpoints(data);
      setServerOnline(true);
      await saveEndpointsToIndexedDB(data);
      if (selectedEndpoint) {
        const updated = data.find((e) => e.id === selectedEndpoint.id);
        setSelectedEndpoint(updated ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch endpoints");
      setServerOnline(false);
      const cached = await getEndpointsFromIndexedDB();
      if (cached.length > 0) {
        setEndpoints(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedEndpoint]);

  useEffect(() => {
    const init = async () => {
      await loadEndpoints();
    };
    init();
    const interval = setInterval(loadEndpoints, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteEndpoint = async (id: string) => {
    try {
      await deleteEndpoint(id);
      if (selectedEndpoint?.id === id) {
        setSelectedEndpoint(null);
      }
      await loadEndpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete endpoint");
    }
  };

  const handleTestEndpoint = (endpoint: MockEndpoint) => {
    setSelectedEndpoint(endpoint);
  };

  const handleDuplicate = async (endpoint: MockEndpoint) => {
    try {
      await createEndpoint({
        path: endpoint.path,
        method: endpoint.method,
        statusCode: endpoint.statusCode,
        responseBody: endpoint.responseBody,
        responseHeaders: endpoint.responseHeaders,
        delay: endpoint.delay,
        description: endpoint.description ? `${endpoint.description} (copy)` : "Copy",
        enabled: true,
      });
      await loadEndpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate");
    }
  };

  const handleToggleEnabled = async (endpoint: MockEndpoint) => {
    try {
      await updateEndpoint(endpoint.id, {
        enabled: endpoint.enabled === false,
      });
      await loadEndpoints();
      if (selectedEndpoint?.id === endpoint.id) {
        setSelectedEndpoint((prev) =>
          prev ? { ...prev, enabled: prev.enabled === false } : null
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-lg font-light tracking-wide">Mock API Tester</h1>
          <Badge variant={serverOnline ? "default" : "destructive"} className="gap-1">
            {serverOnline ? (
              <>
                <Server className="h-3 w-3" />
                Server Online
              </>
            ) : (
              <>
                <ServerOff className="h-3 w-3" />
                Server Offline
              </>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label htmlFor="base-url" className="text-xs text-muted-foreground whitespace-nowrap tracking-wide">
              Base URL
            </label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-48 h-8 text-xs font-mono"
              placeholder="http://localhost:3000"
              aria-label="Base URL for requests"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-2"
            aria-label="Import OpenAPI"
          >
            <FileInput className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadPostmanCollection(endpoints, "mock-api-postman-collection.json", baseUrl)}
            disabled={endpoints.length === 0}
            className="gap-2"
            aria-label="Export to Postman"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEndpoints}
            disabled={loading}
            className="gap-2"
            aria-label="Refresh endpoints"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {error && !serverOnline && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
          <p className="text-sm text-destructive">
            {error}. Make sure the MCP server is running with the REST server started.
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <h2 className="font-heading text-sm font-light tracking-wide">Endpoints ({filteredEndpoints.length})</h2>
            <Input
              placeholder="Search path, method…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
              aria-label="Search endpoints"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <EndpointList
              endpoints={filteredEndpoints}
              selectedEndpoint={selectedEndpoint}
              onSelect={setSelectedEndpoint}
              onTest={handleTestEndpoint}
              onDelete={handleDeleteEndpoint}
              onDuplicate={handleDuplicate}
              onToggleEnabled={handleToggleEnabled}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="tester" className="flex-1 flex flex-col">
            <div className="border-b">
              <TabsList className="h-12 flex justify-start px-4 rounded-none">
                <TabsTrigger value="tester" className="data-[state=active]:bg-background rounded-none">
                  Request Tester
                </TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-background rounded-none">
                  Endpoint Details
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="tester" className="flex-1 m-0 overflow-hidden">
              <RequestTester selectedEndpoint={selectedEndpoint} baseUrl={baseUrl} />
            </TabsContent>
            <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
              <EndpointDetails endpoint={selectedEndpoint} onToggleEnabled={handleToggleEnabled} />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <ImportOpenAPIDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadEndpoints}
      />

      <footer className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Use MCP tools to create, update, or delete endpoints</span>
        <span>Press Ctrl/Cmd + Enter to send request</span>
      </footer>
    </div>
  );
};

export default App;
