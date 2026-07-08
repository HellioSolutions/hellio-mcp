import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export function registerWebhookTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_list_webhooks",
    {
      title: "List webhook endpoints",
      description:
        "Lists your registered webhook endpoints. Requires the `webhooks` scope.",
      inputSchema: {},
      annotations: READ,
    },
    async () => run(() => client.request("/v1/webhooks"))
  );

  server.registerTool(
    "hellio_create_webhook",
    {
      title: "Create a webhook endpoint",
      description:
        "Registers an endpoint to receive delivery receipts. The signing `secret` is returned once, on creation, so store it. Requires the `webhooks` scope.",
      inputSchema: {
        url: z.string().url().describe("The HTTPS endpoint that receives events."),
        events: z
          .array(z.string())
          .describe("Event names to subscribe to, e.g. `message.delivered`."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() => client.request("/v1/webhooks", { method: "POST", body: args }))
  );
}
