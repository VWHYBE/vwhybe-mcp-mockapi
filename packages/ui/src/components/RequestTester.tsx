import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HttpMethod, MockEndpoint, TestResponse, RequestHistoryEntry } from "@/types";
import { testEndpoint } from "@/api";
import { buildCurl } from "@/lib/curl";
import {
  getRequestHistoryFromIndexedDB,
  saveRequestHistoryToIndexedDB,
} from "@/lib/indexed-db";
import { Send, Loader2, Copy, History, RotateCcw } from "lucide-react";

interface RequestTesterProps {
  selectedEndpoint: MockEndpoint | null;
  baseUrl: string;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const methodVariant: Record<HttpMethod, "get" | "post" | "put" | "patch" | "delete"> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return "text-green-500";
  if (status >= 300 && status < 400) return "text-yellow-500";
  if (status >= 400 && status < 500) return "text-orange-500";
  return "text-red-500";
};

const prettifyResponseBody = (body: unknown, indent = 2): string => {
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, indent);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, indent);
};

const extractBodyFields = (responseBody: unknown): Record<string, string> => {
  const fields: Record<string, string> = {};
  const responseStr =
    typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
  const bodyPattern = /\{\{body\.(\w+)\}\}/g;
  let match;
  while ((match = bodyPattern.exec(responseStr)) !== null) {
    fields[match[1]] = "";
  }
  return fields;
};

export const RequestTester = ({ selectedEndpoint, baseUrl }: RequestTesterProps) => {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [requestHeaders, setRequestHeaders] = useState("{}");
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [responseViewMode, setResponseViewMode] = useState<"pretty" | "raw">("pretty");
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>([]);

  const loadEndpointData = useCallback(() => {
    if (selectedEndpoint) {
      setMethod(selectedEndpoint.method);
      setUrl(selectedEndpoint.path);
      if (selectedEndpoint.method !== "GET") {
        const bodyFields = extractBodyFields(selectedEndpoint.responseBody);
        const hasFields = Object.keys(bodyFields).length > 0;
        setRequestBody(
          hasFields ? JSON.stringify(bodyFields, null, 2) : JSON.stringify({}, null, 2)
        );
      } else {
        setRequestBody("");
      }
    }
  }, [selectedEndpoint]);

  useEffect(() => {
    loadEndpointData();
  }, [loadEndpointData]);

  const loadHistory = useCallback(async () => {
    const entries = await getRequestHistoryFromIndexedDB();
    setRequestHistory(entries);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSendRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let parsedBody: unknown = undefined;
      let parsedHeaders: Record<string, string> = {};

      if (requestBody && method !== "GET") {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch {
          throw new Error("Invalid JSON in request body");
        }
      }

      if (requestHeaders) {
        try {
          parsedHeaders = JSON.parse(requestHeaders);
        } catch {
          throw new Error("Invalid JSON in request headers");
        }
      }

      const result = await testEndpoint(
        method,
        url,
        parsedBody,
        parsedHeaders,
        baseUrl
      );
      setResponse(result);

      const entry: RequestHistoryEntry = {
        id: crypto.randomUUID(),
        method,
        url,
        requestBody: method !== "GET" ? requestBody : undefined,
        requestHeaders: requestHeaders !== "{}" ? requestHeaders : undefined,
        status: result.status,
        duration: result.duration,
        timestamp: new Date().toISOString(),
      };
      const next = [entry, ...requestHistory].slice(0, 20);
      setRequestHistory(next);
      await saveRequestHistoryToIndexedDB(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [method, url, requestBody, requestHeaders, baseUrl, requestHistory]);

  const handleLoadFromHistory = (entry: RequestHistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url ?? "");
    setRequestBody(entry.requestBody ?? "");
    setRequestHeaders(entry.requestHeaders ?? "{}");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSendRequest();
    }
  };

  const handleCopyCurl = async () => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (requestHeaders.trim()) {
        headers = { ...headers, ...JSON.parse(requestHeaders) };
      }
    } catch {
      // keep default
    }
    const curl = buildCurl(
      method,
      url,
      baseUrl,
      headers,
      method !== "GET" && requestBody.trim() ? requestBody : undefined
    );
    await navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const responseBodyDisplay =
    response &&
    (responseViewMode === "raw"
      ? typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body)
      : prettifyResponseBody(response.body));

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
            <SelectTrigger className="w-28">
              <SelectValue>
                <Badge variant={methodVariant[method]}>{method}</Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  <Badge variant={methodVariant[m]}>{m}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter request URL (e.g., /api/users/1)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 font-mono"
            aria-label="Request URL"
          />
          <Button
            onClick={handleSendRequest}
            disabled={loading || !url}
            className="gap-2"
            aria-label="Send request"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
        {selectedEndpoint && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 h-auto p-0 text-xs"
            onClick={loadEndpointData}
          >
            Load from selected endpoint: {selectedEndpoint.method} {selectedEndpoint.path}
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col border-r">
          <Tabs defaultValue="body" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="body" className="flex-1 p-4 pt-2">
              <div className="h-full flex flex-col">
                <Label htmlFor="request-body" className="text-xs text-muted-foreground mb-2 tracking-wide">
                  Request Body (JSON)
                </Label>
                <Textarea
                  id="request-body"
                  placeholder='{"key": "value"}'
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="flex-1 font-mono text-sm resize-none"
                  disabled={method === "GET"}
                />
              </div>
            </TabsContent>
            <TabsContent value="headers" className="flex-1 p-4 pt-2">
              <div className="h-full flex flex-col">
                <Label htmlFor="request-headers" className="text-xs text-muted-foreground mb-2 tracking-wide">
                  Request Headers (JSON)
                </Label>
                <Textarea
                  id="request-headers"
                  placeholder='{"Authorization": "Bearer token"}'
                  value={requestHeaders}
                  onChange={(e) => setRequestHeaders(e.target.value)}
                  className="flex-1 font-mono text-sm resize-none"
                />
              </div>
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-hidden m-0 p-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4" />
                <span className="text-sm font-medium">Request history (last 20)</span>
              </div>
              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="space-y-1">
                  {requestHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No requests yet.</p>
                  ) : (
                    requestHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 p-2 rounded border text-xs"
                      >
                        <Badge variant={methodVariant[entry.method]} className="text-[10px]">
                          {entry.method}
                        </Badge>
                        <span className="font-mono truncate flex-1">{entry.url}</span>
                        <span className={getStatusColor(entry.status)}>{entry.status}</span>
                        <span className="text-muted-foreground">{Math.round(entry.duration)}ms</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLoadFromHistory(entry);
                          }}
                          aria-label="Load"
                        >
                          Load
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLoadFromHistory(entry);
                            setTimeout(handleSendRequest, 0);
                          }}
                          aria-label="Re-run"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-heading text-sm font-light tracking-wide">Response</h3>
              <div className="flex items-center gap-2">
                <div className="flex rounded border p-0.5">
                  <button
                    type="button"
                    onClick={() => setResponseViewMode("pretty")}
                    className={`px-2 py-1 text-xs rounded ${responseViewMode === "pretty" ? "bg-accent" : ""}`}
                  >
                    Pretty
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseViewMode("raw")}
                    className={`px-2 py-1 text-xs rounded ${responseViewMode === "raw" ? "bg-accent" : ""}`}
                  >
                    Raw
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={handleCopyCurl}
                  disabled={!url}
                  aria-label="Copy as cURL"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedCurl ? "Copied!" : "Copy as cURL"}
                </Button>
                {response && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className={getStatusColor(response.status)}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(response.duration)}ms
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Separator />

          {error && (
            <Card className="m-4 border-destructive">
              <CardHeader className="py-3">
                <CardTitle className="font-heading text-sm font-light text-destructive tracking-wide">Error</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <p className="text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {response && (
            <Tabs defaultValue="body" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-2 w-fit">
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              <TabsContent value="body" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
                    {responseBodyDisplay}
                  </pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="headers" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">{key}:</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {!response && !error && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Send a request to see the response</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
