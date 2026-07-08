#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { HellioClient } from "./client.js";
import { registerAccountTools } from "./tools/account.js";
import { registerSmsTools } from "./tools/sms.js";
import { registerOtpTools } from "./tools/otp.js";
import { registerVoiceTools } from "./tools/voice.js";
import { registerLookupTools } from "./tools/lookup.js";
import { registerEmailTools } from "./tools/email.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerUssdTools } from "./tools/ussd.js";

const INSTRUCTIONS = `This server exposes the Hellio Messaging API (SMS, OTP, voice, HLR lookup, email verification, and USSD).

Billing and safety:
- Tools whose description begins with "Deducts from your" charge the account's wallet or USSD balance. Confirm intent with the user before calling them.
- Call hellio_get_balance and hellio_get_pricing to estimate cost before bulk sends.
- Send tools attach an idempotency key automatically, so a retried call will not double-charge.
- Which tools succeed depends on the token's scopes; a 403/insufficient-scope error means the token lacks that ability.`;

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new HellioClient(config);

  const server = new McpServer(
    { name: "hellio-messaging", version: "0.1.0" },
    { instructions: INSTRUCTIONS }
  );

  registerAccountTools(server, client);
  registerSmsTools(server, client);
  registerOtpTools(server, client);
  registerVoiceTools(server, client);
  registerLookupTools(server, client);
  registerEmailTools(server, client);
  registerWebhookTools(server, client);
  registerUssdTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stdout is the protocol channel, so all logging goes to stderr.
  console.error(`Hellio MCP server running on stdio (base URL ${config.baseUrl}).`);
}

main().catch((error) => {
  console.error("Fatal error starting Hellio MCP server:", error);
  process.exit(1);
});
