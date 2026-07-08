import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HellioClient } from "../client.js";
import { run } from "../format.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

export function registerVoiceTools(server: McpServer, client: HellioClient): void {
  server.registerTool(
    "hellio_send_voice",
    {
      title: "Send a voice broadcast",
      description:
        "Deducts from your wallet balance. Queues a voice call to one or many recipients. Provide either `text` (synthesized to speech, with an optional `voice`) or `audio_url` (an audio file Hellio fetches). Billed per second of audio per recipient. A retry-safe idempotency key is attached automatically. Requires the `voice` scope.",
      inputSchema: {
        recipients: z.array(z.string()).describe("Destination numbers."),
        text: z.string().optional().describe("Text to synthesize (alternative to audio_url)."),
        voice: z
          .enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
          .optional()
          .describe("Text-to-speech voice, used with `text`. Defaults to alloy."),
        audio_url: z.string().url().optional().describe("URL of an audio file to broadcast."),
        name: z.string().nullish().describe("Optional campaign name."),
      },
      annotations: WRITE,
    },
    async (args) =>
      run(() =>
        client.request("/v1/voice/send", {
          method: "POST",
          autoIdempotency: true,
          body: args,
        })
      )
  );
}
