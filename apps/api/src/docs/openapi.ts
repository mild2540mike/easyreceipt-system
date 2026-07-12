export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "EasyReceipt API",
    version: "0.1.0",
    description:
      "REST API for EasyReceipt branches, purchases, inventory, recipes, reports, and members.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current API host",
    },
    {
      url: "http://localhost:4000/api/v1",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Branches" },
    { name: "Dashboard" },
    { name: "Inventory" },
    { name: "Purchases" },
    { name: "Recipes" },
    { name: "Reports" },
    { name: "Members" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "easyreceipt_session",
        description:
          "HttpOnly JWT cookie set by POST /auth/login. Swagger UI sends it automatically after a successful login on the same host.",
      },
    },
    parameters: {
      branchId: {
        name: "branchId",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "branch-hq",
      },
      ingredientId: {
        name: "ingredientId",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "chicken",
      },
      recipeId: {
        name: "recipeId",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "recipe-basil-chicken",
      },
      planId: {
        name: "planId",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
      memberId: {
        name: "memberId",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "member-owner",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              details: {},
              code: { type: "string" },
            },
            required: ["message"],
          },
        },
        required: ["error"],
      },
      Branch: {
        type: "object",
        properties: {
          id: { type: "string", example: "branch-hq" },
          organizationId: { type: "string" },
          code: { type: "string", example: "HQ" },
          name: { type: "string", example: "สำนักงานใหญ่" },
          location: { type: "string", example: "กรุงเทพฯ" },
          dailyPurchaseBudget: { type: ["number", "null"], example: 1000 },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Member: {
        type: "object",
        properties: {
          id: { type: "string", example: "member-owner" },
          organizationId: { type: "string" },
          primaryBranchId: { type: ["string", "null"], example: "branch-hq" },
          name: { type: "string", example: "คุณยานาร์" },
          username: { type: "string", example: "owner" },
          role: {
            type: "string",
            enum: ["owner", "manager", "staff", "viewer"],
            example: "owner",
          },
          status: {
            type: "string",
            enum: ["active", "invited", "suspended"],
            example: "active",
          },
          lastActiveAt: { type: ["string", "null"], format: "date-time" },
          joinedAt: { type: "string", format: "date-time" },
        },
      },
      Ingredient: {
        type: "object",
        properties: {
          id: { type: "string", example: "chicken" },
          organizationId: { type: "string" },
          name: { type: "string", example: "อกไก่" },
          category: { type: "string", example: "เนื้อสัตว์" },
          unit: { type: "string", example: "กก." },
          defaultPrice: { type: "number", example: 92 },
          supplier: { type: "string", example: "ตลาดสด" },
        },
      },
      InventoryRow: {
        type: "object",
        properties: {
          id: { type: "string" },
          branchId: { type: "string" },
          ingredientId: { type: "string" },
          ingredient: { $ref: "#/components/schemas/Ingredient" },
          onHand: { type: "number", example: 12 },
          reservedQuantity: { type: "number", example: 4.5 },
          reorderPoint: { type: "number", example: 8 },
          costPerUnit: { type: "number", example: 92 },
          available: { type: "number", example: 7.5 },
          suggestedPurchaseQuantity: { type: "number", example: 0 },
          lastUpdatedAt: { type: "string", format: "date-time" },
        },
      },
      PurchaseItemInput: {
        type: "object",
        required: ["ingredientId", "quantity", "unitPrice"],
        properties: {
          ingredientId: { type: "string", example: "chicken" },
          quantity: { type: "number", exclusiveMinimum: 0, example: 5 },
          unit: { type: "string", example: "กก." },
          unitPrice: { type: "number", minimum: 0, example: 92 },
        },
      },
      PurchaseInput: {
        type: "object",
        required: ["purchaseDate", "items"],
        properties: {
          purchaseDate: { type: "string", format: "date-time" },
          vendor: { type: "string", example: "ตลาดสด" },
          status: {
            type: "string",
            enum: ["draft", "saved"],
            default: "saved",
          },
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/PurchaseItemInput" },
          },
        },
      },
      RecipeInput: {
        type: "object",
        required: ["name", "menuCategory", "yield", "pricePerServing", "ingredients"],
        properties: {
          name: { type: "string", example: "ข้าวกะเพราไก่" },
          menuCategory: { type: "string", example: "อาหารจานเดียว" },
          yield: { type: "integer", minimum: 1, example: 24 },
          pricePerServing: { type: "number", minimum: 0, example: 65 },
          ingredients: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["ingredientId", "quantity"],
              properties: {
                ingredientId: { type: "string", example: "chicken" },
                quantity: { type: "number", exclusiveMinimum: 0, example: 4.8 },
              },
            },
          },
        },
      },
      StockNeed: {
        type: "object",
        properties: {
          ingredientId: { type: "string" },
          name: { type: "string", example: "อกไก่" },
          unit: { type: "string", example: "กก." },
          onHand: { type: "number", example: 2 },
          reservedQuantity: { type: "number", example: 8 },
          suggestedPurchaseQuantity: { type: "number", example: 6 },
        },
      },
      MemberInput: {
        type: "object",
        required: ["name", "username", "password", "role", "branchIds"],
        properties: {
          name: { type: "string", example: "พนักงานใหม่" },
          username: { type: "string", example: "staff2" },
          password: { type: "string", minLength: 6, example: "123456" },
          role: {
            type: "string",
            enum: ["owner", "manager", "staff", "viewer"],
            example: "staff",
          },
          branchIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            example: ["branch-hq"],
          },
        },
      },
      MemberUpdateInput: {
        type: "object",
        properties: {
          role: {
            type: "string",
            enum: ["owner", "manager", "staff", "viewer"],
          },
          status: {
            type: "string",
            enum: ["active", "invited", "suspended"],
          },
          branchIds: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Not authenticated.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Authenticated member cannot access this branch or action.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Resource not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Invalid request payload.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health.",
        responses: {
          "200": {
            description: "API is running.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    service: { type: "string", example: "easyreceipt-api" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and set the HttpOnly session cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: {
                    type: "string",
                    example: "owner",
                  },
                  password: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated member and allowed branches.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string" },
                description: "HttpOnly easyreceipt_session cookie.",
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    member: { $ref: "#/components/schemas/Member" },
                    branchIds: {
                      type: "array",
                      items: { type: "string" },
                    },
                    branches: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Branch" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear the session cookie.",
        responses: {
          "204": { description: "Logged out." },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated member.",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Current member and accessible branches.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    member: { $ref: "#/components/schemas/Member" },
                    branchIds: {
                      type: "array",
                      items: { type: "string" },
                    },
                    branches: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Branch" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/branches": {
      get: {
        tags: ["Branches"],
        summary: "List branches the current member can access.",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Accessible branches.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    branches: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Branch" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/branches/{branchId}/budget": {
      patch: {
        tags: ["Branches"],
        summary: "Update a branch daily purchase budget.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["dailyPurchaseBudget"],
                properties: {
                  dailyPurchaseBudget: {
                    type: ["number", "null"],
                    minimum: 0,
                    description: "Daily purchase budget. Null means unlimited.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated branch budget." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/branches/{branchId}/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get branch dashboard metrics and purchase needs.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        responses: {
          "200": {
            description: "Dashboard summary.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    purchaseTotal: { type: "number" },
                    cookingCount: { type: "integer" },
                    stockNeedCount: { type: "integer" },
                    stockNeeds: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StockNeed" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/branches/{branchId}/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "List branch inventory rows.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        responses: {
          "200": {
            description: "Inventory rows.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    inventory: {
                      type: "array",
                      items: { $ref: "#/components/schemas/InventoryRow" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/branches/{branchId}/inventory/{ingredientId}": {
      patch: {
        tags: ["Inventory"],
        summary: "Update ingredient master data and branch inventory values.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/ingredientId" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "name",
                  "category",
                  "unit",
                  "defaultPrice",
                  "supplier",
                  "onHand",
                  "reorderPoint",
                  "costPerUnit",
                ],
                properties: {
                  name: { type: "string", example: "อกไก่" },
                  category: { type: "string", example: "เนื้อสัตว์" },
                  unit: { type: "string", example: "กก." },
                  defaultPrice: { type: "number", minimum: 0, example: 92 },
                  supplier: { type: "string", example: "ตลาดสด" },
                  onHand: { type: "number", minimum: 0, example: 12 },
                  reorderPoint: { type: "number", minimum: 0, example: 8 },
                  costPerUnit: { type: "number", minimum: 0, example: 92 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated inventory row." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/branches/{branchId}/purchases": {
      get: {
        tags: ["Purchases"],
        summary: "List recent branch purchases.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          {
            name: "date",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter purchases by Bangkok business date (YYYY-MM-DD).",
          },
        ],
        responses: {
          "200": { description: "Recent purchases." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Purchases"],
        summary: "Create a purchase and add stock in one transaction.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PurchaseInput" },
            },
          },
        },
        responses: {
          "201": { description: "Purchase created." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/branches/{branchId}/recipes": {
      get: {
        tags: ["Recipes"],
        summary: "List active branch recipes with latest pinned or cooked plans.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        responses: {
          "200": { description: "Recipes." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Recipes"],
        summary: "Create a recipe.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/branchId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecipeInput" },
            },
          },
        },
        responses: {
          "201": { description: "Recipe created." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/branches/{branchId}/recipes/{recipeId}": {
      patch: {
        tags: ["Recipes"],
        summary: "Update a recipe that is not currently pinned.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/recipeId" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecipeInput" },
            },
          },
        },
        responses: {
          "200": { description: "Recipe updated." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Recipes"],
        summary: "Deactivate a recipe and release active reservations.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/recipeId" },
        ],
        responses: {
          "204": { description: "Recipe deleted." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/branches/{branchId}/recipes/{recipeId}/pin": {
      post: {
        tags: ["Recipes"],
        summary: "Pin a recipe and reserve its ingredients.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/recipeId" },
        ],
        responses: {
          "201": { description: "Recipe plan pinned." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/branches/{branchId}/recipes/{recipeId}/unpin": {
      post: {
        tags: ["Recipes"],
        summary: "Unpin a recipe and release active reservations.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/recipeId" },
        ],
        responses: {
          "200": { description: "Recipe plan unpinned." },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/branches/{branchId}/recipe-plans/{planId}/cook": {
      post: {
        tags: ["Recipes"],
        summary: "Cook a pinned recipe plan, consume stock, and release reservations.",
        security: [{ sessionCookie: [] }],
        parameters: [
          { $ref: "#/components/parameters/branchId" },
          { $ref: "#/components/parameters/planId" },
        ],
        responses: {
          "200": { description: "Cooking run completed." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/reports/summary": {
      get: {
        tags: ["Reports"],
        summary: "Get a report summary for branches the current member can access.",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Accessible-branch report summary.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    branchCount: { type: "integer" },
                    branchNames: {
                      type: "array",
                      items: { type: "string" },
                    },
                    purchaseTotal: { type: "number" },
                    dailyPurchases: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", example: "2026-07-05" },
                          branchId: { type: "string" },
                          branchName: { type: "string" },
                          total: { type: "number" },
                        },
                      },
                    },
                    cookingCount: { type: "integer" },
                    stockMovementCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/members": {
      get: {
        tags: ["Members"],
        summary: "List members visible to the current member.",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "Members." },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Members"],
        summary: "Invite a new member.",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MemberInput" },
            },
          },
        },
        responses: {
          "201": { description: "Member invited." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/members/{memberId}": {
      patch: {
        tags: ["Members"],
        summary: "Update member role, status, or branch access.",
        security: [{ sessionCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/memberId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MemberUpdateInput" },
            },
          },
        },
        responses: {
          "200": { description: "Member updated." },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
} as const
