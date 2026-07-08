import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export function registerOtpTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_send_otp",
    {
      title: "Send an OTP",
      description:
        "Deducts from your wallet balance. Generates a one-time passcode and delivers it over SMS, voice or email. The returned `reference` is the uuid of the message it spawns, so you can track delivery with hellio_get_message. A retry-safe idempotency key is attached automatically. Requires the `otp` scope.",
      inputSchema: {
        mobile_number: z.string().optional().describe("Destination number (for sms/voice)."),
        email: z.string().email().optional().describe("Destination email (for the email channel)."),
        sender: z.string().optional().describe("Sender ID for SMS."),
        channel: z.enum(["sms", "voice", "email"]).optional().describe("Delivery channel."),
        length: z.number().int().optional().describe("Number of digits in the code."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() =>
        client.request("/v1/otp/send", {
          method: "POST",
          autoIdempotency: true,
          body: args,
        })
      )
  );

  server.registerTool(
    "hellio_verify_otp",
    {
      title: "Verify an OTP",
      description:
        "Checks a code the user entered against the most recent OTP for that destination. Returns verified true/false. Requires the `otp` scope.",
      inputSchema: {
        code: z.string().describe("The code the user entered."),
        mobile_number: z.string().optional(),
        email: z.string().email().optional(),
        channel: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) =>
      run(() =>
        client.request("/v1/otp/verify", { method: "POST", body: args })
      )
  );
}
