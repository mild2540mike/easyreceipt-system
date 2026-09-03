const dateTime = { type: "string", format: "date-time" }
const quantity = {
  type: "number",
  minimum: 0,
  maximum: 999999999,
  multipleOf: 0.001,
}
const summaryProperties = {
  id: { type: "string" },
  branchId: { type: "string" },
  startedAt: dateTime,
  savedAt: dateTime,
  createdByName: { type: "string" },
  itemCount: { type: "integer" },
}
const checkResponse = {
  description:
    "Saved snapshot. An identical retried request returns the original result without adjusting stock again.",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { check: { $ref: "#/components/schemas/StockCheck" } },
      },
    },
  },
}
export const stockCheckSchemas = {
  LastStockCount: {
    type: ["object", "null"],
    properties: {
      quantity,
      unit: { type: "string" },
      countedAt: dateTime,
      savedAt: dateTime,
      countedBy: { type: "string" },
      checkId: { type: "string" },
    },
  },
  StockCheckSummary: { type: "object", properties: summaryProperties },
  StockCheck: {
    type: "object",
    properties: {
      ...summaryProperties,
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            ingredientId: { type: "string" },
            name: { type: "string" },
            unit: { type: "string" },
            systemQuantity: quantity,
            actualQuantity: quantity,
            difference: { type: "number" },
            countedAt: dateTime,
          },
        },
      },
    },
  },
  StockCheckInput: {
    type: "object",
    additionalProperties: false,
    required: ["requestId", "startedAt", "items"],
    properties: {
      requestId: {
        type: "string",
        format: "uuid",
        description:
          "Persist before sending; reuse with the identical payload after an uncertain response.",
      },
      startedAt: dateTime,
      items: {
        type: "array",
        minItems: 1,
        maxItems: 2000,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "ingredientId",
            "unit",
            "systemQuantity",
            "actualQuantity",
            "inventoryVersion",
            "countedAt",
          ],
          properties: {
            ingredientId: { type: "string" },
            unit: { type: "string" },
            systemQuantity: quantity,
            actualQuantity: quantity,
            inventoryVersion: {
              ...dateTime,
              description:
                "Unmodified inventoryVersion from the inventory response at count confirmation.",
            },
            countedAt: dateTime,
          },
        },
      },
    },
  },
}
export const stockCheckPaths = {
  "/branches/{branchId}/stock-checks": {
    post: {
      tags: ["Inventory"],
      summary:
        "Save a stock check and atomically reconcile confirmed quantities.",
      description:
        "Requires stock-check view and edit permissions and branch access. A conflict rolls back the entire batch; error.details.ingredientIds identifies counts to reconfirm. Adjustments are separate from purchase/usage movements.",
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: "#/components/parameters/branchId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StockCheckInput" },
          },
        },
      },
      responses: {
        "200": checkResponse,
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Missing stock-check permission or branch access.",
        },
        "409": {
          description:
            "Stale inventory/unit or reused requestId with another payload. No partial adjustment.",
        },
      },
    },
    get: {
      tags: ["Inventory"],
      summary: "Read stock-check history, newest first.",
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: "#/components/parameters/branchId" },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", minimum: 0, default: 0 },
        },
      ],
      responses: {
        "200": {
          description:
            "Up to 20 saved checks and nextOffset (null on the last page).",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  checks: {
                    type: "array",
                    items: { $ref: "#/components/schemas/StockCheckSummary" },
                  },
                  nextOffset: { type: ["integer", "null"] },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Missing stock-check view permission or branch access.",
        },
      },
    },
  },
  "/branches/{branchId}/stock-checks/{checkId}": {
    get: {
      tags: ["Inventory"],
      summary: "Read the immutable details of a saved stock check.",
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: "#/components/parameters/branchId" },
        {
          name: "checkId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": checkResponse,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Missing stock-check view permission or branch access.",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
}
