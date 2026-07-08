import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true } as const;

const cursor = z.string().optional().describe("Opaque pagination cursor.");
const perPage = z.number().int().max(200).optional();

export function registerUssdTools(server: McpServer, client: HellioClient): void {
  // --- Pricing ---------------------------------------------------------------
  server.registerTool(
    "hellio_ussd_get_pricing",
    {
      title: "USSD pricing",
      description:
        "Returns the shared short code, per-network session prices, and per-length monthly extension rentals. Requires the `ussd` scope.",
      inputSchema: {},
      annotations: READ,
    },
    async () => run(() => client.request("/v1/ussd/pricing"))
  );

  server.registerTool(
    "hellio_ussd_check_extension_availability",
    {
      title: "Check extension availability",
      description:
        "Reports whether a specific extension code is a valid length, free to rent, and its monthly price. Requires the `ussd` scope.",
      inputSchema: {
        code: z.string().describe("The numeric extension code, e.g. `100`."),
      },
      annotations: READ,
    },
    async ({ code }) =>
      run(() => client.request("/v1/ussd/pricing/availability", { query: { code } }))
  );

  // --- Apps ------------------------------------------------------------------
  server.registerTool(
    "hellio_ussd_list_apps",
    {
      title: "List USSD apps",
      description:
        "Cursor-paginated list of your USSD apps, newest first. Requires the `ussd` scope.",
      inputSchema: { cursor, per_page: perPage },
      annotations: READ,
    },
    async ({ cursor, per_page }) =>
      run(() => client.request("/v1/ussd/apps", { query: { cursor, per_page } }))
  );

  server.registerTool(
    "hellio_ussd_create_app",
    {
      title: "Create a USSD app",
      description:
        "Creates an app that points the short code at your callback URL. Starts in `test` mode and returns `test_secret` and `live_secret` (shown once). The callback URL must be public. Requires the `ussd` scope.",
      inputSchema: {
        name: z.string().max(120),
        callback_url: z
          .string()
          .url()
          .describe("Public HTTPS URL that receives each session step."),
        active: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() => client.request("/v1/ussd/apps", { method: "POST", body: args }))
  );

  server.registerTool(
    "hellio_ussd_update_app",
    {
      title: "Update a USSD app",
      description:
        "Updates an app's name, callback URL, or active state. Requires the `ussd` scope.",
      inputSchema: {
        id: z.string().uuid().describe("The app id."),
        name: z.string(),
        callback_url: z.string().url(),
        active: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ id, ...body }) =>
      run(() =>
        client.request(`/v1/ussd/apps/${encodeURIComponent(id)}`, {
          method: "PUT",
          body,
        })
      )
  );

  server.registerTool(
    "hellio_ussd_delete_app",
    {
      title: "Delete a USSD app",
      description: "Deletes a USSD app. Requires the `ussd` scope.",
      inputSchema: { id: z.string().uuid().describe("The app id.") },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      run(() =>
        client.request(`/v1/ussd/apps/${encodeURIComponent(id)}`, { method: "DELETE" })
      )
  );

  server.registerTool(
    "hellio_ussd_switch_app_mode",
    {
      title: "Switch an app between test and live",
      description:
        "Switches the app to `test` (sandbox) or `live`. Going live requires an active purchased extension for the app, otherwise the call returns 402 extension_required. Requires the `ussd` scope.",
      inputSchema: {
        id: z.string().uuid().describe("The app id."),
        mode: z.enum(["test", "live"]),
      },
      annotations: WRITE,
    },
    async ({ id, mode }) =>
      run(() =>
        client.request(`/v1/ussd/apps/${encodeURIComponent(id)}/mode`, {
          method: "POST",
          body: { mode },
        })
      )
  );

  server.registerTool(
    "hellio_ussd_rotate_app_secret",
    {
      title: "Rotate an app signing secret",
      description:
        "Rotates one mode's signing secret. The old secret stops working immediately. Requires the `ussd` scope.",
      inputSchema: {
        id: z.string().uuid().describe("The app id."),
        mode: z.enum(["test", "live"]).describe("Which secret to replace."),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, mode }) =>
      run(() =>
        client.request(`/v1/ussd/apps/${encodeURIComponent(id)}/rotate-secret`, {
          method: "POST",
          body: { mode },
        })
      )
  );

  // --- Extensions ------------------------------------------------------------
  server.registerTool(
    "hellio_ussd_list_extensions",
    {
      title: "List extensions",
      description:
        "Cursor-paginated list of your rented extensions, newest first. Requires the `ussd` scope.",
      inputSchema: { cursor, per_page: perPage },
      annotations: READ,
    },
    async ({ cursor, per_page }) =>
      run(() => client.request("/v1/ussd/extensions", { query: { cursor, per_page } }))
  );

  server.registerTool(
    "hellio_ussd_rent_extension",
    {
      title: "Rent an extension",
      description:
        "Deducts from your USSD balance (separate from SMS credit and your main wallet). Rents a numeric extension on the shared short code, priced by digit length (shorter is premium). Requires the `ussd` scope.",
      inputSchema: {
        code: z.string().max(12).describe("Numeric extension, e.g. `100`."),
        app_id: z.string().uuid().nullish().describe("An app of yours to route this extension to."),
        short_code: z
          .string()
          .nullish()
          .describe("Which shared short code to rent under, e.g. `*921#`. Defaults to primary."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() => client.request("/v1/ussd/extensions", { method: "POST", body: args }))
  );

  server.registerTool(
    "hellio_ussd_release_extension",
    {
      title: "Release an extension",
      description: "Releases a rented extension. Requires the `ussd` scope.",
      inputSchema: { id: z.string().uuid().describe("The extension id.") },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      run(() =>
        client.request(`/v1/ussd/extensions/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })
      )
  );

  // --- Sessions --------------------------------------------------------------
  server.registerTool(
    "hellio_ussd_list_sessions",
    {
      title: "List sessions",
      description:
        "Cursor-paginated list of your USSD sessions, newest first. Filter with `status` (`active`, `ended`, `timeout`, `failed`). Requires the `ussd` scope.",
      inputSchema: {
        status: z.enum(["active", "ended", "timeout", "failed"]).optional(),
        cursor,
        per_page: perPage,
      },
      annotations: READ,
    },
    async ({ status, cursor, per_page }) =>
      run(() =>
        client.request("/v1/ussd/sessions", { query: { status, cursor, per_page } })
      )
  );

  server.registerTool(
    "hellio_ussd_get_session",
    {
      title: "Get session detail",
      description:
        "Returns a single session by its uuid, including developer steps and amount charged. Requires the `ussd` scope.",
      inputSchema: { id: z.string().uuid().describe("The session id.") },
      annotations: READ,
    },
    async ({ id }) =>
      run(() => client.request(`/v1/ussd/sessions/${encodeURIComponent(id)}`))
  );

  // --- Sandbox simulation ----------------------------------------------------
  server.registerTool(
    "hellio_ussd_simulate",
    {
      title: "Simulate a session (sandbox)",
      description:
        "Drives a USSD session against one of your own apps in test mode, with no telco, no purchased extension, and no charge. Open with `new_session: true` and empty `input`, then repeat with the same `session_id` and the next input until the reply returns `action: end`. Requires the `ussd` scope.",
      inputSchema: {
        app_id: z.string().describe("The id of one of your USSD apps to simulate."),
        session_id: z.string().max(120).describe("Any stable id you choose for this session."),
        msisdn: z.string().max(20).describe("The simulated subscriber number."),
        service_code: z.string().max(32).nullish().describe("Optional dialled code. Defaults to the shared short code."),
        input: z.string().max(182).nullish().describe("The subscriber's input for this step. Empty on the first step."),
        new_session: z.boolean().optional().describe("True to open a fresh session."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() => client.request("/v1/ussd/simulate", { method: "POST", body: args }))
  );
}
