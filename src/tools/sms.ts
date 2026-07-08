import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

const recipients = z
  .union([z.array(z.string()), z.string()])
  .describe("An array of numbers, or a comma/newline-separated string.");

export function registerSmsTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_send_sms",
    {
      title: "Send an SMS campaign",
      description:
        "Spends real money. Queues an SMS to one or many recipients from an approved sender ID. Cost is reserved from your wallet up front and a campaign reference is returned for tracking. A retry-safe idempotency key is attached automatically. Requires the `sms:send` scope.",
      inputSchema: {
        recipients,
        sender: z.string().max(11).describe("An approved sender ID (max 11 chars)."),
        message: z.string().describe("The message body."),
        gateway: z.string().nullish().describe("Optional gateway override."),
      },
      annotations: WRITE,
    },
    async ({ recipients, sender, message, gateway }) =>
      run(() =>
        client.request("/v1/sms/send", {
          method: "POST",
          autoIdempotency: true,
          body: { recipients, sender, message, gateway },
        })
      )
  );

  server.registerTool(
    "hellio_list_messages",
    {
      title: "List messages",
      description:
        "Cursor-paginated list of your messages, newest first. Requires the `reports` scope.",
      inputSchema: {
        status: z.string().optional().describe("Filter by delivery status."),
        cursor: z.string().optional().describe("Opaque pagination cursor."),
        per_page: z.number().int().max(200).optional(),
      },
      annotations: READ,
    },
    async ({ status, cursor, per_page }) =>
      run(() =>
        client.request("/v1/messages", { query: { status, cursor, per_page } })
      )
  );

  server.registerTool(
    "hellio_get_message",
    {
      title: "Get message status",
      description:
        "Returns the delivery status of a single message by its `reference` (uuid). Requires the `reports` scope.",
      inputSchema: {
        id: z.string().describe("The message `reference` (uuid)."),
      },
      annotations: READ,
    },
    async ({ id }) =>
      run(() => client.request(`/v1/messages/${encodeURIComponent(id)}`))
  );

  server.registerTool(
    "hellio_list_campaigns",
    {
      title: "List campaigns",
      description:
        "Cursor-paginated list of your campaigns, newest first. Requires the `reports` scope.",
      inputSchema: {
        status: z.string().optional().describe("Filter by campaign status."),
        cursor: z.string().optional(),
        per_page: z.number().int().max(200).optional(),
      },
      annotations: READ,
    },
    async ({ status, cursor, per_page }) =>
      run(() =>
        client.request("/v1/campaigns", { query: { status, cursor, per_page } })
      )
  );

  server.registerTool(
    "hellio_get_campaign",
    {
      title: "Get campaign summary",
      description:
        "Returns a campaign with a delivery-status breakdown, by its `reference` (uuid) or numeric id. Requires the `reports` scope.",
      inputSchema: {
        id: z.string().describe("The campaign `reference` (uuid) or numeric id."),
      },
      annotations: READ,
    },
    async ({ id }) =>
      run(() => client.request(`/v1/campaigns/${encodeURIComponent(id)}`))
  );
}
