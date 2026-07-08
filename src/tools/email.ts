import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export function registerEmailTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_verify_email",
    {
      title: "Verify email addresses",
      description:
        "Deducts from your wallet balance. Checks one or more email addresses for deliverability (syntax, MX records, mailbox existence, disposable and role-account detection). Billed per address checked. Requires the `email:verify` scope.",
      inputSchema: {
        emails: z.array(z.string().email()).min(1).describe("One or more email addresses."),
      },
      annotations: WRITE,
    },
    async ({ emails }) =>
      run(() => client.request("/v1/email/verify", { method: "POST", body: { emails } }))
  );
}
