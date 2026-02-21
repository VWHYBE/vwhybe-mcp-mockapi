import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MockEndpoint, HttpMethod } from "@/types";
import { Trash2, Play, Copy, Power, PowerOff } from "lucide-react";

interface EndpointListProps {
  endpoints: MockEndpoint[];
  selectedEndpoint: MockEndpoint | null;
  onSelect: (endpoint: MockEndpoint) => void;
  onTest: (endpoint: MockEndpoint) => void;
  onDelete: (id: string) => void;
  onDuplicate: (endpoint: MockEndpoint) => void;
  onToggleEnabled: (endpoint: MockEndpoint) => void;
}

const methodVariant: Record<HttpMethod, "get" | "post" | "put" | "patch" | "delete"> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

export const EndpointList = ({
  endpoints,
  selectedEndpoint,
  onSelect,
  onTest,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: EndpointListProps) => {
  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">No endpoints configured</p>
        <p className="text-xs mt-1">Use the MCP tools to create endpoints</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.id}
            role="button"
            tabIndex={0}
            aria-label={`Select ${endpoint.method} ${endpoint.path}`}
            className={`group flex items-center gap-2 py-2 cursor-pointer transition-colors ${
              selectedEndpoint?.id === endpoint.id
                ? "bg-accent"
                : "hover:bg-muted"
            } ${endpoint.enabled === false ? "opacity-60" : ""}`}
            onClick={() => onSelect(endpoint)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelect(endpoint);
              }
            }}
          >
            <Badge variant={methodVariant[endpoint.method]} className="ml-2 w-16 justify-center text-xs">
              {endpoint.method}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono truncate">{endpoint.path}</p>
              {endpoint.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {endpoint.description}
                </p>
              )}
            </div>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={endpoint.enabled === false ? "Enable endpoint" : "Disable endpoint"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(endpoint);
                }}
                title={endpoint.enabled === false ? "Enable" : "Disable"}
              >
                {endpoint.enabled === false ? (
                  <PowerOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Power className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Duplicate endpoint"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(endpoint);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Test endpoint"
                onClick={(e) => {
                  e.stopPropagation();
                  onTest(endpoint);
                }}
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                aria-label="Delete endpoint"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(endpoint.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
