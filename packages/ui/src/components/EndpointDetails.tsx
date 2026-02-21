import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { MockEndpoint, HttpMethod } from "@/types";
import { Power, PowerOff } from "lucide-react";

interface EndpointDetailsProps {
  endpoint: MockEndpoint | null;
  onToggleEnabled?: (endpoint: MockEndpoint) => void;
}

const methodVariant: Record<HttpMethod, "get" | "post" | "put" | "patch" | "delete"> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

export const EndpointDetails = ({ endpoint, onToggleEnabled }: EndpointDetailsProps) => {
  if (!endpoint) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Select an endpoint to view details</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={methodVariant[endpoint.method]} className="text-sm">
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {endpoint.path}
          </code>
          {onToggleEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 ml-auto"
              onClick={() => onToggleEnabled(endpoint)}
              aria-label={endpoint.enabled === false ? "Enable endpoint" : "Disable endpoint"}
            >
              {endpoint.enabled === false ? (
                <>
                  <PowerOff className="h-3 w-3" />
                  Disabled
                </>
              ) : (
                <>
                  <Power className="h-3 w-3" />
                  Enabled
                </>
              )}
            </Button>
          )}
        </div>

        {endpoint.description && (
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
        )}

        <Separator />

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="font-heading text-sm font-light tracking-wide">Response Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status Code:</span>
              <Badge
                variant={endpoint.statusCode >= 200 && endpoint.statusCode < 300 ? "default" : "destructive"}
              >
                {endpoint.statusCode}
              </Badge>
            </div>

            {endpoint.delay && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Delay:</span>
                <span className="text-sm">{endpoint.delay}ms</span>
              </div>
            )}

            <div>
              <span className="text-sm text-muted-foreground block mb-2">Response Headers:</span>
              <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                {JSON.stringify(endpoint.responseHeaders, null, 2)}
              </pre>
            </div>

            <div>
              <span className="text-sm text-muted-foreground block mb-2">Response Body:</span>
              <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto max-h-64">
                {typeof endpoint.responseBody === "string"
                  ? endpoint.responseBody
                  : JSON.stringify(endpoint.responseBody, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="font-heading text-sm font-light tracking-wide">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enabled:</span>
              <span>{endpoint.enabled !== false ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID:</span>
              <code className="text-xs bg-muted px-1 rounded">{endpoint.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{new Date(endpoint.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated:</span>
              <span>{new Date(endpoint.updatedAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
