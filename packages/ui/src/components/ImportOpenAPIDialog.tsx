import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseOpenAPISpec } from "@/lib/openapi";
import { createEndpoint } from "@/api";
import { FileUp, Loader2 } from "lucide-react";

interface ImportOpenAPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export const ImportOpenAPIDialog = ({
  open,
  onOpenChange,
  onImported,
}: ImportOpenAPIDialogProps) => {
  const [specText, setSpecText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSpecText(String(reader.result));
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError(null);
    setImporting(true);
    setImportedCount(0);
    try {
      const spec = JSON.parse(specText) as Parameters<typeof parseOpenAPISpec>[0];
      const payloads = parseOpenAPISpec(spec);
      if (payloads.length === 0) {
        setError("No endpoints found in the OpenAPI spec.");
        return;
      }
      let count = 0;
      for (const p of payloads) {
        try {
          await createEndpoint({
            path: p.path,
            method: p.method,
            statusCode: p.statusCode,
            responseBody: p.responseBody,
            description: p.description,
          });
          count++;
        } catch {
          // skip duplicate or invalid
        }
      }
      setImportedCount(count);
      setSpecText("");
      onImported();
      if (count < payloads.length) {
        setError(`Imported ${count} of ${payloads.length} endpoints (some may have been skipped).`);
      } else {
        setError(null);
        setTimeout(() => onOpenChange(false), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OpenAPI JSON");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSpecText("");
    setError(null);
    setImportedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle className="font-heading font-light tracking-wide">Import from OpenAPI (Swagger)</DialogTitle>
          <DialogDescription>
            Paste your OpenAPI 3.x JSON or upload a file. Endpoints will be created as mocks with
            default or example responses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              Upload file
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openapi-paste">Or paste JSON</Label>
            <Textarea
              id="openapi-paste"
              placeholder='{"openapi":"3.0.0","paths":{"/api/users":{"get":{...}}}}'
              value={specText}
              onChange={(e) => {
                setSpecText(e.target.value);
                setError(null);
              }}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {importedCount > 0 && !error && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Imported {importedCount} endpoint(s).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || !specText.trim()}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
