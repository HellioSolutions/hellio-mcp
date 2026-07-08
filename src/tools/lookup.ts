import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export function registerLookupTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_lookup_numbers",
    {
      title: "Number (HLR) lookup",
      description:
        "Deducts from your wallet balance. Queues a batch of HLR number lookups. Lookups run asynchronously; the response confirms how many numbers were accepted. Requires the `lookup` scope.",
      inputSchema: {
        numbers: z
          .union([z.array(z.string()), z.string()])
          .describe("An array of numbers, or a comma/newline-separated string."),
        scheduled_at: z
          .string()
          .datetime()
          .nullish()
          .describe("Optional ISO-8601 time to run the lookups."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() => client.request("/v1/lookup", { method: "POST", body: args }))
  );
}
