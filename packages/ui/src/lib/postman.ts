import type { MockEndpoint } from "@/types";

/**
 * Postman Collection v2.1 format
 * https://schema.postman.com/json/collection/v2.1.0/collection.json
 */
export const exportToPostmanCollection = (
  endpoints: MockEndpoint[],
  collectionName = "Mock API",
  baseUrlValue = "http://localhost:3000"
): string => {
  const baseUrl = "{{baseUrl}}";

  const items = endpoints.map((ep) => {
    const request: Record<string, unknown> = {
      method: ep.method,
      header: [
        { key: "Content-Type", value: "application/json", type: "text" },
      ],
      url: {
        raw: `${baseUrl}${ep.path}`,
        host: [baseUrl],
        path: ep.path.split("/").filter(Boolean),
      },
      description: ep.description ?? "",
    };

    if (ep.method !== "GET") {
      request.body = {
        mode: "raw",
        raw: "{}",
        options: { raw: { language: "json" } },
      };
    }

    return {
      name: `${ep.method} ${ep.path}`,
      request,
    };
  });

  const collection = {
    info: {
      name: collectionName,
      schema:
        "https://schema.postman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: baseUrlValue,
      },
    ],
    item: items,
  };

  return JSON.stringify(collection, null, 2);
};

export const downloadPostmanCollection = (
  endpoints: MockEndpoint[],
  filename = "mock-api-postman-collection.json",
  baseUrl = "http://localhost:3000"
): void => {
  const json = exportToPostmanCollection(endpoints, "Mock API", baseUrl);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
