import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const READ = { readOnlyHint: true, openWorldHint: true } as const;

export function registerAccountTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_get_balance",
    {
      title: "Get wallet balance",
      description:
        "Returns your current wallet balance, the amount reserved for in-flight sends, and the spendable amount. Requires the `balance` scope.",
      inputSchema: {},
      annotations: READ,
    },
    async () => run(() => client.request("/v1/balance"))
  );

  server.registerTool(
    "hellio_get_pricing",
    {
      title: "Get per-network SMS pricing",
      description:
        "Lists the price per SMS segment for each network, optionally filtered by ISO-2 country code. Use it to estimate cost before sending. Requires the `balance` scope.",
      inputSchema: {
        country: z
          .string()
          .length(2)
          .optional()
          .describe("ISO-2 country filter, e.g. `GH`."),
      },
      annotations: READ,
    },
    async ({ country }) =>
      run(() => client.request("/v1/pricing", { query: { country } }))
  );
}
